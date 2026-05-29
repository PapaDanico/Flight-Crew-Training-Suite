import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { eq, sql } from 'drizzle-orm';
import { operators } from '@dnca/db';
import type { Database } from '@dnca/db';
import type { Role, OperatorId, UserId } from '@dnca/domain';
import { resolveAuthMode, type Config } from '../config.js';

/**
 * Authenticated principal attached to every request that passes the auth
 * gate. Provider-agnostic: WorkOS supplies the identity in production
 * (ADR 0008); the dev/demo path uses a synthetic principal.
 */
export interface Principal {
  userId: UserId;
  email: string;
  fullName: string;
  operatorId: OperatorId | null;
  roles: ReadonlyArray<Role>;
  source: 'workos' | 'demo';
}

declare module 'fastify' {
  interface FastifyRequest {
    principal: Principal;
  }
}

interface AuthOptions {
  config: Config;
  db: Database;
}

/**
 * WorkOS access-token claims the API actually reads. WorkOS AuthKit issues
 * tokens with at minimum `sub`, `iss`, `exp`, `iat`, plus AuthKit-specific
 * claims `org_id`, `role`, and `permissions` when the user is in an
 * organization context. Email and name flow as standard OIDC claims.
 */
interface WorkOSClaims extends JWTPayload {
  sub: string;
  email?: string;
  name?: string;
  org_id?: string;
  role?: string;
  permissions?: ReadonlyArray<string>;
}

const PLATFORM_ADMIN_ROLE = 'platform-admin';

/**
 * Maps WorkOS roles to our domain Role union. Unknown roles fall back to
 * the minimum-privilege PILOT role; mapping will become operator-config-
 * driven in Sprint 3 so deployments can customise without a code change.
 */
function mapWorkOSRole(workosRole: string | undefined): Role {
  switch (workosRole) {
    case PLATFORM_ADMIN_ROLE:
      return 'PLATFORM_ADMIN';
    case 'head-of-training':
    case 'admin':
      return 'HEAD_OF_TRAINING';
    case 'chief-pilot':
      return 'CHIEF_PILOT';
    case 'safety-manager':
      return 'SAFETY_MANAGER';
    case 'quality-manager':
      return 'QUALITY_MANAGER';
    case 'accountable-manager':
      return 'ACCOUNTABLE_MANAGER';
    case 'tre':
      return 'TRE';
    case 'tri':
      return 'TRI';
    case 'lce':
      return 'LCE';
    case 'ltc':
      return 'LTC';
    case 'pilot':
    default:
      return 'PILOT';
  }
}

/**
 * Verifies the request bearer token, resolves to a Principal, and attaches
 * it to the request. Production path uses jose to verify against the
 * WorkOS JWKS; dev/test path attaches a synthetic platform-admin scoped
 * to a header-provided operator (test fixtures depend on this).
 *
 * Operator scoping: `org_id` from the JWT maps to operators row whose
 * `config->>'workosOrganizationId'` matches. The lookup runs OUTSIDE any
 * tenant-scoped transaction (operators table is not RLS-protected;
 * see infra/migrations/0001_initial.sql RLS DO block).
 */
export const authPlugin: FastifyPluginAsync<AuthOptions> = async (app, opts) => {
  app.decorateRequest('principal', null as unknown as Principal);

  // Effective auth mode is decided once at registration. assertAuthModeSafe()
  // (called in buildApp) has already refused unsafe fail-open combinations.
  const authMode = resolveAuthMode(opts.config);

  // Lazy-construct the JWKS only when production auth actually fires, so
  // dev/test boots don't hit the WorkOS network. createRemoteJWKSet caches
  // keys; jose handles rotation transparently.
  let jwksGetter: ReturnType<typeof createRemoteJWKSet> | null = null;
  function getJwks() {
    if (jwksGetter) return jwksGetter;
    const url = resolveJwksUrl(opts.config);
    if (!url) {
      throw app.httpErrors.internalServerError(
        'WorkOS JWKS URL not configured. Set WORKOS_JWKS_URL or WORKOS_CLIENT_ID.',
      );
    }
    jwksGetter = createRemoteJWKSet(new URL(url));
    return jwksGetter;
  }

  app.addHook('onRequest', async (request) => {
    // Routes can opt out of auth with `config: { auth: 'none' }` (e.g. /health
    // for load-balancer probes). The hook must honour it — otherwise such
    // routes 401 in production. These routes must not read request.principal.
    const routeAuth = (request.routeOptions?.config as { auth?: string } | undefined)?.auth;
    if (routeAuth === 'none') {
      return;
    }

    if (authMode === 'demo') {
      request.principal = synthesizeDemoPrincipal(request);
      return;
    }

    const token = extractBearerToken(request);
    if (!token) {
      throw app.httpErrors.unauthorized('Missing or malformed Authorization header');
    }

    let claims: WorkOSClaims;
    try {
      const { payload } = await jwtVerify(token, getJwks(), {
        issuer: opts.config.WORKOS_ISSUER,
        // Audience verification is best-effort — WorkOS access tokens may
        // omit `aud` depending on AuthKit config. If `aud` is present we
        // accept any value (we trust the issuer signature); explicit
        // audience pinning lands once the AuthKit instance is provisioned.
      });
      claims = payload as WorkOSClaims;
    } catch (err) {
      request.log.warn({ err: (err as Error).message }, 'jwt_verify_failed');
      throw app.httpErrors.unauthorized('Invalid or expired token');
    }

    const orgId = claims.org_id;
    if (!orgId) {
      throw app.httpErrors.forbidden(
        'Token has no organization context; sign in via an organization-scoped session',
      );
    }

    const operatorId = await lookupOperatorByWorkOSOrg(opts.db, orgId);
    if (!operatorId) {
      throw app.httpErrors.forbidden(
        `No operator deployment for WorkOS organization ${orgId}. ` +
          'Contact platform admin to provision the operator config.',
      );
    }

    request.principal = {
      userId: claims.sub as UserId,
      email: claims.email ?? '',
      fullName: claims.name ?? claims.email ?? claims.sub,
      operatorId,
      roles: [mapWorkOSRole(claims.role)] as ReadonlyArray<Role>,
      source: 'workos',
    };
  });
};

function resolveJwksUrl(config: Config): string | null {
  if (config.WORKOS_JWKS_URL) return config.WORKOS_JWKS_URL;
  if (config.WORKOS_CLIENT_ID) {
    return `${config.WORKOS_ISSUER.replace(/\/+$/, '')}/sso/jwks/${config.WORKOS_CLIENT_ID}`;
  }
  return null;
}

function extractBearerToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() ?? null;
}

async function lookupOperatorByWorkOSOrg(
  db: Database,
  workosOrgId: string,
): Promise<OperatorId | null> {
  // operators table is NOT RLS-protected (see infra/migrations/0001); a
  // direct SELECT works without app.operator_id set. The query matches on
  // config->>'workosOrganizationId' which is part of the typed
  // OperatorConfig contract in @dnca/domain.
  const rows = await db
    .select({ id: operators.id })
    .from(operators)
    .where(eq(sql`(${operators.config}->>'workosOrganizationId')`, workosOrgId))
    .limit(1);
  return (rows[0]?.id as OperatorId) ?? null;
}

const DEMO_ROLES = new Set([
  'PLATFORM_ADMIN',
  'ACCOUNTABLE_MANAGER',
  'HEAD_OF_TRAINING',
  'CHIEF_PILOT',
  'SAFETY_MANAGER',
  'QUALITY_MANAGER',
  'TRI',
  'TRE',
  'LCE',
  'LTC',
  'PILOT',
]);

function synthesizeDemoPrincipal(request: FastifyRequest): Principal {
  // Demo path: every request is a platform-admin scoped to JAK by default.
  // Tests + dev tools override the operator via x-demo-operator-id and the
  // role via x-demo-role so RBAC behaviour can be exercised without a
  // WorkOS round trip. Used only when NODE_ENV !== 'production'.
  const operatorIdHeader = request.headers['x-demo-operator-id'];
  const operatorId =
    typeof operatorIdHeader === 'string' && /^[0-9a-f-]{36}$/i.test(operatorIdHeader)
      ? (operatorIdHeader as OperatorId)
      : ('11111111-1111-1111-1111-111111111111' as OperatorId);

  const roleHeader = request.headers['x-demo-role'];
  const role =
    typeof roleHeader === 'string' && DEMO_ROLES.has(roleHeader)
      ? (roleHeader as Role)
      : 'PLATFORM_ADMIN';

  return {
    userId: '99999999-9999-9999-9999-000000000001' as UserId,
    email: 'demo@dnca.aero',
    fullName: `Demo ${role}`,
    operatorId,
    roles: [role] as ReadonlyArray<Role>,
    source: 'demo',
  };
}

export default fp(authPlugin, { name: 'auth' });

import { z } from 'zod';

/**
 * Environment configuration. Validated at server boot — a missing or
 * mis-typed env var fails fast with an actionable error rather than
 * surfacing as a confusing runtime crash mid-request.
 */
const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().url().or(z.string().startsWith('postgres://')),

  // Authentication mode. Explicit opt-in is the safe contract: when unset it
  // is DERIVED from NODE_ENV (production => workos, otherwise => demo), but
  // assertAuthModeSafe() refuses fail-open combinations at boot. Set
  // AUTH_MODE=demo explicitly to run the synthetic principal anywhere.
  AUTH_MODE: z.enum(['workos', 'demo']).optional(),

  // WorkOS — required in production, optional in dev (then auth plugin runs
  // in DEMO mode with a synthetic operator).
  WORKOS_API_KEY: z.string().optional(),
  WORKOS_CLIENT_ID: z.string().optional(),
  WORKOS_COOKIE_PASSWORD: z.string().min(32).optional(),
  // JWKS URL used to verify WorkOS-issued access tokens. Defaults to the
  // standard AuthKit JWKS endpoint derived from WORKOS_CLIENT_ID; override
  // for self-hosted or custom-domain deployments.
  WORKOS_JWKS_URL: z.string().url().optional(),
  // Expected issuer of WorkOS-signed JWTs. Defaults to https://api.workos.com.
  WORKOS_ISSUER: z.string().url().default('https://api.workos.com'),

  // Anthropic — optional; routes that need it return 503 if unset.
  ANTHROPIC_API_KEY: z.string().optional(),

  // CORS origin allowlist. apps/web's deployed URL in production.
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Observability. Structured logs (JSON to stdout) + correlation IDs are
  // always on; an OTLP endpoint, when set, is where a future trace/metric
  // exporter ships to (Grafana Cloud / Datadog, per ADR). SERVICE_NAME tags
  // every log line and would tag spans.
  SERVICE_NAME: z.string().default('dnca-api'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}

export function isProduction(c: Config): boolean {
  return c.NODE_ENV === 'production';
}

export type AuthMode = 'workos' | 'demo';

/** True if any WorkOS credential is configured (i.e. this looks like a real deployment). */
export function hasWorkOSCredentials(c: Config): boolean {
  return Boolean(c.WORKOS_API_KEY ?? c.WORKOS_CLIENT_ID ?? c.WORKOS_JWKS_URL);
}

/**
 * The effective auth mode. Explicit AUTH_MODE wins; otherwise derive from
 * NODE_ENV (production => workos, else demo).
 */
export function resolveAuthMode(c: Config): AuthMode {
  return c.AUTH_MODE ?? (c.NODE_ENV === 'production' ? 'workos' : 'demo');
}

/**
 * Fail-closed boot guard. The demo path authenticates every request as a
 * PLATFORM_ADMIN whose tenant is chosen by a request header — catastrophic if
 * it ever runs in front of real data. Called from buildApp(); throws rather
 * than letting an ambiguous environment silently fail open.
 */
export function assertAuthModeSafe(c: Config): AuthMode {
  const mode = resolveAuthMode(c);
  if (mode === 'demo') {
    if (c.NODE_ENV === 'production') {
      throw new Error(
        'AUTH refusing to start: demo auth (synthetic PLATFORM_ADMIN) cannot run with NODE_ENV=production. ' +
          'Set AUTH_MODE=workos and configure WorkOS, or unset NODE_ENV for local/demo use.',
      );
    }
    // Real deployment smell: WorkOS creds are present but we'd run demo (e.g. a
    // prod container that forgot NODE_ENV=production). Require explicit opt-in.
    if (hasWorkOSCredentials(c) && c.AUTH_MODE !== 'demo') {
      throw new Error(
        'AUTH refusing to start: WorkOS credentials are configured but auth would run in DEMO mode ' +
          '(fail-open). Set NODE_ENV=production (or AUTH_MODE=workos) for real auth, or set AUTH_MODE=demo to override deliberately.',
      );
    }
  } else {
    // workos mode needs a verifiable JWKS source.
    if (!c.WORKOS_JWKS_URL && !c.WORKOS_CLIENT_ID) {
      throw new Error(
        'AUTH refusing to start: AUTH_MODE=workos but neither WORKOS_JWKS_URL nor WORKOS_CLIENT_ID is set.',
      );
    }
  }
  return mode;
}

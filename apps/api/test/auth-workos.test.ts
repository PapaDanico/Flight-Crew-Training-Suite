import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { FastifyInstance } from 'fastify';

/**
 * WorkOS production-auth path tests. We don't talk to WorkOS — we stand up
 * a local HTTP server that serves a JWKS, generate keys, mint tokens, and
 * verify the auth plugin's behaviour against valid / expired / wrong-issuer
 * / unknown-org / no-org tokens.
 *
 * Requires DATABASE_URL (the operator lookup is a real query). The
 * operators table must be seeded with workosOrganizationId in config.jsonb.
 */

const skip = !process.env['DATABASE_URL'];
const ISSUER = 'https://test.workos.example';
const IFLY_OPERATOR_ID = '22222222-2222-2222-2222-222222222222';
const IFLY_ORG_ID = 'org_ifly_demo';

let jwksServer: Server | null = null;
let jwksUrl = '';
let signingKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'] | null = null;
let kid = '';
let app: FastifyInstance | null = null;

before(async () => {
  if (skip) return;

  const { publicKey, privateKey } = await generateKeyPair('RS256');
  signingKey = privateKey;
  kid = 'test-key-1';
  const jwk = await exportJWK(publicKey);
  jwk.kid = kid;
  jwk.alg = 'RS256';
  jwk.use = 'sig';
  const jwks = { keys: [jwk] };

  jwksServer = createServer((_, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(jwks));
  });
  await new Promise<void>((resolve) => jwksServer!.listen(0, '127.0.0.1', resolve));
  const port = (jwksServer.address() as AddressInfo).port;
  jwksUrl = `http://127.0.0.1:${port}/jwks`;

  process.env['NODE_ENV'] = 'production';
  process.env['WORKOS_JWKS_URL'] = jwksUrl;
  process.env['WORKOS_ISSUER'] = ISSUER;
  // Production mode rejects pino-pretty (transport options change) and
  // requires CORS to default; rate-limit needs nothing extra.
  const { buildApp } = await import('../src/server.js');
  app = await buildApp();
  await app.ready();
});

after(async () => {
  if (app) await app.close();
  if (jwksServer)
    await new Promise<void>((resolve, reject) =>
      jwksServer!.close((err) => (err ? reject(err) : resolve())),
    );
  // Restore env so subsequent test files in the same process don't pick up
  // production mode.
  delete process.env['WORKOS_JWKS_URL'];
  delete process.env['WORKOS_ISSUER'];
  process.env['NODE_ENV'] = 'development';
});

async function mintToken(
  claims: Record<string, unknown>,
  overrides: { iss?: string; expSeconds?: number } = {},
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid })
    .setIssuer(overrides.iss ?? ISSUER)
    .setIssuedAt()
    .setExpirationTime(overrides.expSeconds ?? '15m')
    .sign(signingKey!);
}

describe('WorkOS production auth', { skip }, () => {
  it('401s requests with no Authorization header', async () => {
    const res = await app!.inject({ method: 'GET', url: '/pilots' });
    assert.equal(res.statusCode, 401);
  });

  it('401s requests with a malformed bearer', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/pilots',
      headers: { authorization: 'NotBearer something' },
    });
    assert.equal(res.statusCode, 401);
  });

  it('401s tokens signed by an unknown issuer', async () => {
    const token = await mintToken(
      { sub: 'user_x', org_id: IFLY_ORG_ID },
      { iss: 'https://evil.example' },
    );
    const res = await app!.inject({
      method: 'GET',
      url: '/pilots',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 401);
  });

  it('401s expired tokens', async () => {
    const token = await mintToken(
      { sub: 'user_x', org_id: IFLY_ORG_ID },
      { expSeconds: Math.floor(Date.now() / 1000) - 60 },
    );
    const res = await app!.inject({
      method: 'GET',
      url: '/pilots',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 401);
  });

  it('403s a valid token with no org_id claim', async () => {
    const token = await mintToken({ sub: 'user_x' });
    const res = await app!.inject({
      method: 'GET',
      url: '/pilots',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
  });

  it('403s a valid token whose org_id has no operator deployment', async () => {
    const token = await mintToken({ sub: 'user_x', org_id: 'org_unknown' });
    const res = await app!.inject({
      method: 'GET',
      url: '/pilots',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
  });

  it('accepts a valid token and scopes the request to the operator from org_id', async () => {
    const token = await mintToken({
      sub: 'user_ifly_admin',
      email: 'admin@ifly.example',
      name: 'I-Fly Admin',
      org_id: IFLY_ORG_ID,
      role: 'head-of-training',
    });
    const res = await app!.inject({
      method: 'GET',
      url: '/pilots',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { pilots: Array<{ operatorId: string }> };
    for (const p of body.pilots) {
      assert.equal(p.operatorId, IFLY_OPERATOR_ID, 'principal must be scoped to I-Fly');
    }
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadConfig, resolveJwtVerification } from '../src/config.js';

const BASE = { DATABASE_URL: 'postgres://u:p@localhost:5432/db' };

function cfg(extra: Record<string, string>) {
  return loadConfig({ ...BASE, ...extra } as NodeJS.ProcessEnv);
}

/**
 * Provider-agnostic JWT verification resolution: generic AUTH_* wins, WorkOS is
 * the fallback. Lets a non-WorkOS IdP (Cognito/ZITADEL/Keycloak/Supabase) plug
 * in with env only.
 */
describe('resolveJwtVerification', () => {
  it('derives the AuthKit JWKS URL from WORKOS_CLIENT_ID and defaults the org claim', () => {
    const v = resolveJwtVerification(cfg({ WORKOS_CLIENT_ID: 'client_123' }));
    assert.equal(v.jwksUrl, 'https://api.workos.com/sso/jwks/client_123');
    assert.equal(v.issuer, 'https://api.workos.com');
    assert.equal(v.audience, null);
    assert.equal(v.orgClaim, 'org_id');
  });

  it('lets generic AUTH_* values override the WorkOS defaults', () => {
    const v = resolveJwtVerification(
      cfg({
        WORKOS_CLIENT_ID: 'client_123',
        AUTH_JWKS_URL: 'https://idp.example.com/.well-known/jwks.json',
        AUTH_ISSUER: 'https://idp.example.com/',
        AUTH_AUDIENCE: 'dnca-api',
        AUTH_ORG_CLAIM: 'organization_id',
      }),
    );
    assert.equal(v.jwksUrl, 'https://idp.example.com/.well-known/jwks.json');
    assert.equal(v.issuer, 'https://idp.example.com/');
    assert.equal(v.audience, 'dnca-api');
    assert.equal(v.orgClaim, 'organization_id');
  });

  it('is null jwksUrl when nothing is configured (demo/dev)', () => {
    const v = resolveJwtVerification(cfg({}));
    assert.equal(v.jwksUrl, null);
    assert.equal(v.orgClaim, 'org_id');
  });

  it('prefers an explicit WORKOS_JWKS_URL over the derived one', () => {
    const v = resolveJwtVerification(
      cfg({ WORKOS_CLIENT_ID: 'client_123', WORKOS_JWKS_URL: 'https://custom/jwks' }),
    );
    assert.equal(v.jwksUrl, 'https://custom/jwks');
  });
});

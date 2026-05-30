import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadConfig, resolveAuthMode, assertAuthModeSafe } from '../src/config.js';

/**
 * Pure (no-DB) tests for the fail-closed auth-mode resolution (bug B2).
 * The demo path authenticates every request as a PLATFORM_ADMIN whose tenant
 * is a request header — so the boot guard must refuse every fail-open combo.
 */

const base = {
  DATABASE_URL: 'postgres://app_runtime:ci@localhost:5432/fokker_ci',
};

const cfg = (env: Record<string, string>) => loadConfig({ ...base, ...env });

describe('resolveAuthMode', () => {
  it('derives demo when not production and unset', () => {
    assert.equal(resolveAuthMode(cfg({ NODE_ENV: 'development' })), 'demo');
  });
  it('derives workos in production when unset', () => {
    assert.equal(
      resolveAuthMode(cfg({ NODE_ENV: 'production', WORKOS_CLIENT_ID: 'client_x' })),
      'workos',
    );
  });
  it('honours an explicit AUTH_MODE', () => {
    assert.equal(
      resolveAuthMode(
        cfg({ NODE_ENV: 'development', AUTH_MODE: 'workos', WORKOS_CLIENT_ID: 'client_x' }),
      ),
      'workos',
    );
  });
});

describe('assertAuthModeSafe — fail closed', () => {
  it('allows demo locally with no WorkOS creds', () => {
    assert.equal(assertAuthModeSafe(cfg({ NODE_ENV: 'development' })), 'demo');
  });

  it('refuses demo in production', () => {
    assert.throws(
      () => assertAuthModeSafe(cfg({ NODE_ENV: 'production', AUTH_MODE: 'demo' })),
      /cannot run with NODE_ENV=production/,
    );
  });

  it('refuses demo when WorkOS creds are present but mode not explicitly demo (forgot NODE_ENV=production)', () => {
    assert.throws(
      () => assertAuthModeSafe(cfg({ NODE_ENV: 'development', WORKOS_CLIENT_ID: 'client_x' })),
      /fail-open/,
    );
  });

  it('allows demo with WorkOS creds ONLY when AUTH_MODE=demo is explicit', () => {
    assert.equal(
      assertAuthModeSafe(
        cfg({ NODE_ENV: 'development', AUTH_MODE: 'demo', WORKOS_CLIENT_ID: 'client_x' }),
      ),
      'demo',
    );
  });

  it('refuses workos mode with no JWKS source', () => {
    assert.throws(
      () => assertAuthModeSafe(cfg({ NODE_ENV: 'production' })),
      /neither WORKOS_JWKS_URL nor WORKOS_CLIENT_ID/,
    );
  });

  it('allows workos in production with a client id', () => {
    assert.equal(
      assertAuthModeSafe(cfg({ NODE_ENV: 'production', WORKOS_CLIENT_ID: 'client_x' })),
      'workos',
    );
  });
});

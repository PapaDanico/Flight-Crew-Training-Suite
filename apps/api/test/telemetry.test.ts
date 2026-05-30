import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAccessLogFields } from '../src/plugins/telemetry.js';
import type { OperatorId, UserId } from '@dnca/domain';

/**
 * Pure (no-DB) tests for the access-log shaper. The plugin's hooks are thin;
 * the field shaping — tenant/actor tagging and duration rounding — is here.
 */
describe('buildAccessLogFields', () => {
  it('tags the tenant, actor and roles from the principal', () => {
    const f = buildAccessLogFields({
      reqId: 'req-123',
      method: 'POST',
      route: '/api/pilots',
      statusCode: 201,
      durationMs: 12.3456,
      principal: {
        operatorId: 'op-1' as OperatorId,
        userId: 'user-1' as UserId,
        roles: ['HEAD_OF_TRAINING', 'TRE'] as never,
        source: 'workos',
      },
    });
    assert.equal(f.operatorId, 'op-1');
    assert.equal(f.actorUserId, 'user-1');
    assert.equal(f.actorRoles, 'HEAD_OF_TRAINING,TRE');
    assert.equal(f.authSource, 'workos');
    assert.equal(f.statusCode, 201);
    assert.equal(f.route, '/api/pilots');
    assert.equal(f.durationMs, 12.346); // rounded to 3dp
  });

  it('nulls tenant/actor fields on an unauthenticated (auth:none) request', () => {
    const f = buildAccessLogFields({
      reqId: 'req-9',
      method: 'GET',
      route: '/health',
      statusCode: 200,
      durationMs: 0.4,
      principal: undefined,
    });
    assert.equal(f.operatorId, null);
    assert.equal(f.actorUserId, null);
    assert.equal(f.actorRoles, null);
    assert.equal(f.authSource, null);
  });

  it('represents a platform-admin with a null operator (cross-tenant) as null tenant', () => {
    const f = buildAccessLogFields({
      reqId: 'req-7',
      method: 'GET',
      route: '/api/pilots',
      statusCode: 200,
      durationMs: 3,
      principal: {
        operatorId: null,
        userId: 'admin-1' as UserId,
        roles: [] as never,
        source: 'demo',
      },
    });
    assert.equal(f.operatorId, null);
    assert.equal(f.actorRoles, null);
    assert.equal(f.authSource, 'demo');
  });
});

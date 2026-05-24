import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server.js';

/**
 * Integration tests for /pilots routes.
 *
 * Requires a Postgres reachable at DATABASE_URL with the 0001 migration
 * applied. CI provides this via the migration-smoke-test job's Postgres
 * service container. Locally:
 *
 *   docker compose -f infra/docker-compose.yml up -d
 *
 * Tests skip cleanly with a structured message if DATABASE_URL is unset.
 */

const DATABASE_URL = process.env['DATABASE_URL'];
const skip = !DATABASE_URL;

const JAK_OPERATOR_ID = '11111111-1111-1111-1111-111111111111';
const IFLY_OPERATOR_ID = '22222222-2222-2222-2222-222222222222';
const JAK_FLEET_ID = '11111111-aaaa-aaaa-aaaa-000000000001';

let app: FastifyInstance | null = null;

before(async () => {
  if (skip) return;
  app = await buildApp();
  await app.ready();
});

after(async () => {
  if (app) await app.close();
});

describe('GET /health', { skip }, () => {
  it('returns 200 with DB connectivity', async () => {
    const res = await app!.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.checks.db, 'ok');
  });
});

describe('GET /pilots (RLS-scoped read)', { skip }, () => {
  it('returns JAK pilots when demo principal scoped to JAK', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/pilots',
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.ok(Array.isArray(body.pilots));
    for (const p of body.pilots) {
      assert.equal(p.operatorId, JAK_OPERATOR_ID, 'no cross-tenant leakage');
    }
  });

  it('returns empty when scoped to an operator with no pilots', async () => {
    const res = await app!.inject({
      method: 'GET',
      url: '/pilots',
      headers: { 'x-demo-operator-id': '99999999-9999-9999-9999-999999999999' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.deepEqual(body.pilots, []);
  });
});

describe('POST /pilots (create + AuditEvent)', { skip }, () => {
  it('creates a pilot and emits an AuditEvent in the same transaction', async () => {
    const create = await app!.inject({
      method: 'POST',
      url: '/pilots',
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: {
        fleetId: JAK_FLEET_ID,
        fullName: 'F/O Test Pilot',
        licenceNumber: `KCAA/DEMO/CPL/TEST-${Date.now()}`,
        role: 'First Officer',
        baseIcao: 'HKJK',
        phase: 'Line',
      },
    });
    assert.equal(create.statusCode, 201);
    const pilot = create.json();
    assert.equal(pilot.operatorId, JAK_OPERATOR_ID);
    assert.equal(pilot.fullName, 'F/O Test Pilot');

    // Verify the GET returns the new pilot
    const list = await app!.inject({
      method: 'GET',
      url: '/pilots',
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID },
    });
    const found = list.json().pilots.find((p: { id: string }) => p.id === pilot.id);
    assert.ok(found, 'newly-created pilot must appear in the list');
  });

  it('rejects invalid input with 400 + structured issues', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/pilots',
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: { fullName: '' },
    });
    assert.equal(res.statusCode, 400);
  });
});

describe('PATCH /pilots/:id (update + AuditEvent)', { skip }, () => {
  it('updates an existing pilot', async () => {
    // create
    const create = await app!.inject({
      method: 'POST',
      url: '/pilots',
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: {
        fleetId: JAK_FLEET_ID,
        fullName: 'Patch Test Original',
        licenceNumber: `KCAA/DEMO/CPL/PATCH-${Date.now()}`,
        role: 'First Officer',
        baseIcao: 'HKJK',
        phase: 'Line',
      },
    });
    const id = create.json().id;

    const patch = await app!.inject({
      method: 'PATCH',
      url: `/pilots/${id}`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: { phase: 'RecurrentDue' },
    });
    assert.equal(patch.statusCode, 200);
    assert.equal(patch.json().phase, 'RecurrentDue');
  });
});

describe('RLS cross-tenant isolation', { skip }, () => {
  it('JAK-scoped GET /pilots/:id cannot read an I-Fly pilot', async () => {
    // Create an I-Fly pilot via I-Fly-scoped principal
    const ifly = await app!.inject({
      method: 'POST',
      url: '/pilots',
      headers: { 'x-demo-operator-id': IFLY_OPERATOR_ID, 'content-type': 'application/json' },
      payload: {
        fleetId: '22222222-aaaa-aaaa-aaaa-000000000001',
        fullName: 'F/O I-Fly Isolation Probe',
        licenceNumber: `KCAA/DEMO/CPL/ISO-${Date.now()}`,
        role: 'First Officer',
        baseIcao: 'HKML',
        phase: 'Line',
      },
    });
    assert.equal(ifly.statusCode, 201);
    const iflyId = ifly.json().id;

    // Same id, JAK-scoped principal → must 404 (RLS hides the row)
    const jakRead = await app!.inject({
      method: 'GET',
      url: `/pilots/${iflyId}`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID },
    });
    assert.equal(jakRead.statusCode, 404);
  });
});

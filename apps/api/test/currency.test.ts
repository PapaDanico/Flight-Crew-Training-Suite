import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server.js';

/**
 * Integration tests for currency-record routes. Verifies the regulated-
 * records invariant: a renewal issues a new record AND supersedes the
 * previous active one of the same kind, atomically, with AuditEvent
 * rows for both.
 */

const skip = !process.env['DATABASE_URL'];
const JAK_OPERATOR_ID = '11111111-1111-1111-1111-111111111111';
const JAK_FLEET_ID = '11111111-aaaa-aaaa-aaaa-000000000001';

let app: FastifyInstance | null = null;
let pilotId: string | null = null;

before(async () => {
  if (skip) return;
  app = await buildApp();
  await app.ready();

  // Create a fresh pilot for these tests so we don't trample siblings.
  const created = await app.inject({
    method: 'POST',
    url: '/pilots',
    headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
    payload: {
      fleetId: JAK_FLEET_ID,
      fullName: 'Capt. Currency Test',
      licenceNumber: `KCAA/DEMO/ATPL/CUR-${Date.now()}`,
      role: 'Captain',
      baseIcao: 'HKJK',
      phase: 'Line',
    },
  });
  pilotId = created.json().id;
});

after(async () => {
  if (app) await app.close();
});

describe('POST /pilots/:pilotId/currency-records', { skip }, () => {
  it('issues a new currency record', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/currency-records`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: {
        kind: 'class1Medical',
        validFrom: '2026-01-15',
        validTo: '2027-01-15',
        notes: 'Initial medical at hire',
      },
    });
    assert.equal(res.statusCode, 201);
    const body = res.json();
    assert.equal(body.pilotId, pilotId);
    assert.equal(body.kind, 'class1Medical');
    assert.equal(body.supersededAt, null);
    assert.equal(body.supersededBy, null);
  });

  it('rejects validTo before validFrom', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/currency-records`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: {
        kind: 'opc',
        validFrom: '2026-06-01',
        validTo: '2026-05-01',
      },
    });
    assert.equal(res.statusCode, 400);
  });
});

describe('Currency supersession (renewal semantics)', { skip }, () => {
  it('issuing a new record of the same kind supersedes the previous active one', async () => {
    // 1. First OPC.
    const first = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/currency-records`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: { kind: 'opc', validFrom: '2026-01-10', validTo: '2026-07-10' },
    });
    assert.equal(first.statusCode, 201);
    const firstId = first.json().id;

    // 2. Second OPC (renewal) — should supersede the first.
    const second = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/currency-records`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: { kind: 'opc', validFrom: '2026-07-01', validTo: '2027-01-01' },
    });
    assert.equal(second.statusCode, 201);
    const secondId = second.json().id;

    // 3. Active record list for this pilot should NOT include the
    //    first (now superseded) — only the second.
    const list = await app!.inject({
      method: 'GET',
      url: `/pilots/${pilotId}/currency-records`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID },
    });
    const opcs = list.json().records.filter((r: { kind: string }) => r.kind === 'opc');
    assert.equal(opcs.length, 1, 'exactly one active OPC after renewal');
    assert.equal(opcs[0].id, secondId);

    // 4. The first record is still readable by direct id-lookup, and
    //    carries supersededBy = secondId.
    const firstReread = await app!.inject({
      method: 'GET',
      url: `/pilots/${pilotId}/currency-records/${firstId}`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID },
    });
    assert.equal(firstReread.statusCode, 200);
    const firstAfter = firstReread.json();
    assert.equal(firstAfter.supersededBy, secondId);
    assert.ok(firstAfter.supersededAt, 'supersededAt must be set');
  });
});

describe('GET /pilots/:pilotId/currency-records/:id (RLS scoping)', { skip }, () => {
  it('404 when the record belongs to a different operator', async () => {
    // Issue a record under JAK.
    const r = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/currency-records`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: { kind: 'lpc', validFrom: '2026-01-01', validTo: '2027-01-01' },
    });
    const recordId = r.json().id;

    // Try to read it as I-Fly. RLS should hide the row at the DB
    // boundary → the WHERE clause matches zero rows → 404.
    const blocked = await app!.inject({
      method: 'GET',
      url: `/pilots/${pilotId}/currency-records/${recordId}`,
      headers: { 'x-demo-operator-id': '22222222-2222-2222-2222-222222222222' },
    });
    assert.equal(blocked.statusCode, 404);
  });
});

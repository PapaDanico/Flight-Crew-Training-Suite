import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { ICAO_COMPETENCY } from '@dnca/domain';
import { buildApp } from '../src/server.js';

/**
 * RBAC integration tests. The synth-principal dev path accepts an
 * x-demo-role header so we can exercise each role group end-to-end
 * without minting a real WorkOS token. PLATFORM_ADMIN bypasses every
 * check; PILOT (the minimum-privilege role) is rejected from every
 * mutating route.
 */

const skip = !process.env['DATABASE_URL'];
const JAK_OPERATOR_ID = '11111111-1111-1111-1111-111111111111';
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

function authed(role: string, body?: object) {
  const headers: Record<string, string> = {
    'x-demo-operator-id': JAK_OPERATOR_ID,
    'x-demo-role': role,
    'content-type': 'application/json',
  };
  return { headers, ...(body !== undefined ? { payload: body } : {}) };
}

const pilotInsert = () => ({
  fleetId: JAK_FLEET_ID,
  fullName: `Capt. RBAC ${Date.now()}`,
  licenceNumber: `KCAA/DEMO/ATPL/RBAC-${Date.now()}`,
  role: 'Captain',
  baseIcao: 'HKJK',
  phase: 'Line',
});

const eightGrades = () =>
  ICAO_COMPETENCY.map((c) => ({
    competency: c,
    grade: { scale: 'AS-S-MS-BS', value: 'S' },
  }));

describe('RBAC: pilot CRUD', { skip }, () => {
  it('PILOT cannot create a pilot record', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/pilots',
      ...authed('PILOT', pilotInsert()),
    });
    assert.equal(res.statusCode, 403);
  });

  it('TRI cannot create a pilot record (instructors do not maintain the roster)', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/pilots',
      ...authed('TRI', pilotInsert()),
    });
    assert.equal(res.statusCode, 403);
  });

  it('HEAD_OF_TRAINING CAN create a pilot record', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/pilots',
      ...authed('HEAD_OF_TRAINING', pilotInsert()),
    });
    assert.equal(res.statusCode, 201);
  });

  it('PLATFORM_ADMIN bypass: also CAN create a pilot record', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: '/pilots',
      ...authed('PLATFORM_ADMIN', pilotInsert()),
    });
    assert.equal(res.statusCode, 201);
  });

  it('CHIEF_PILOT can soft-delete via PILOT_WRITE? No — DELETE requires PILOT_DELETE (HoT or AM only)', async () => {
    const create = await app!.inject({
      method: 'POST',
      url: '/pilots',
      ...authed('HEAD_OF_TRAINING', pilotInsert()),
    });
    const id = create.json().id;

    const blocked = await app!.inject({
      method: 'DELETE',
      url: `/pilots/${id}`,
      ...authed('CHIEF_PILOT', { reason: 'rbac test' }),
    });
    assert.equal(blocked.statusCode, 403);

    const allowed = await app!.inject({
      method: 'DELETE',
      url: `/pilots/${id}`,
      ...authed('HEAD_OF_TRAINING', { reason: 'rbac test' }),
    });
    assert.equal(allowed.statusCode, 200);
  });
});

describe('RBAC: currency issuance', { skip }, () => {
  let pilotId: string;
  before(async () => {
    if (skip) return;
    const r = await app!.inject({
      method: 'POST',
      url: '/pilots',
      ...authed('HEAD_OF_TRAINING', pilotInsert()),
    });
    pilotId = r.json().id;
  });

  it('PILOT cannot issue a currency record', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/currency-records`,
      ...authed('PILOT', {
        kind: 'class1Medical',
        validFrom: '2026-01-01',
        validTo: '2027-01-01',
      }),
    });
    assert.equal(res.statusCode, 403);
  });

  it('TRE CAN issue a currency record', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/currency-records`,
      ...authed('TRE', {
        kind: 'opc',
        validFrom: '2026-01-01',
        validTo: '2026-07-01',
      }),
    });
    assert.equal(res.statusCode, 201);
  });
});

describe('RBAC: session create + sign-off', { skip }, () => {
  let pilotId: string;
  let sessionId: string;
  before(async () => {
    if (skip) return;
    const p = await app!.inject({
      method: 'POST',
      url: '/pilots',
      ...authed('HEAD_OF_TRAINING', pilotInsert()),
    });
    pilotId = p.json().id;

    const s = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/sessions`,
      ...authed('TRE', { kind: 'OPC', venue: 'FFS', startedAt: new Date().toISOString() }),
    });
    sessionId = s.json().id;

    await app!.inject({
      method: 'POST',
      url: `/sessions/${sessionId}/exercises`,
      ...authed('TRE', {
        ordinal: 1,
        title: 'RBAC test exercise',
        reference: 'OM-D rbac',
        competencyGrades: eightGrades(),
      }),
    });
  });

  it('PILOT cannot create a session', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/sessions`,
      ...authed('PILOT', { kind: 'OPC', venue: 'FFS', startedAt: new Date().toISOString() }),
    });
    assert.equal(res.statusCode, 403);
  });

  it('TRI cannot sign off — sign-off authority is TRE/LCE/LTC/HoT/AM', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: `/sessions/${sessionId}/sign-off`,
      ...authed('TRI', {
        signedByRole: 'TRI',
        statement: 'attempt by TRI; should 403',
      }),
    });
    assert.equal(res.statusCode, 403);
  });

  it('TRE CAN sign off', async () => {
    const res = await app!.inject({
      method: 'POST',
      url: `/sessions/${sessionId}/sign-off`,
      ...authed('TRE', {
        signedByRole: 'TRE',
        statement: 'Meets standard.',
      }),
    });
    assert.equal(res.statusCode, 200);
  });
});

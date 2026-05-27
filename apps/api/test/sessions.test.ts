import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import { ICAO_COMPETENCY } from '@dnca/domain';
import { buildApp } from '../src/server.js';

/**
 * Integration tests for session-logging routes. Verifies the CBTA write
 * path end-to-end: create draft -> add exercise (with all 8 competency
 * grades atomically) -> sign off. Also exercises the state-machine
 * guards and RLS isolation.
 */

const skip = !process.env['DATABASE_URL'];
const JAK_OPERATOR_ID = '11111111-1111-1111-1111-111111111111';
const IFLY_OPERATOR_ID = '22222222-2222-2222-2222-222222222222';
const JAK_FLEET_ID = '11111111-aaaa-aaaa-aaaa-000000000001';

const allEightGrades = (): Array<{
  competency: string;
  grade: { scale: 'AS-S-MS-BS'; value: 'S' };
}> =>
  ICAO_COMPETENCY.map((c) => ({
    competency: c,
    grade: { scale: 'AS-S-MS-BS', value: 'S' },
  }));

let app: FastifyInstance | null = null;
let pilotId: string | null = null;

before(async () => {
  if (skip) return;
  app = await buildApp();
  await app.ready();

  const created = await app.inject({
    method: 'POST',
    url: '/pilots',
    headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
    payload: {
      fleetId: JAK_FLEET_ID,
      fullName: 'Capt. Session Test',
      licenceNumber: `KCAA/DEMO/ATPL/SES-${Date.now()}`,
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

describe('Session lifecycle: create -> add exercise -> sign off', { skip }, () => {
  it('walks the full happy path and emits expected response shapes', async () => {
    // 1. Create DRAFT session
    const sessRes = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/sessions`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: {
        kind: 'OPC',
        venue: 'FFS',
        ffsDesignation: 'FR-101',
        startedAt: new Date().toISOString(),
      },
    });
    assert.equal(sessRes.statusCode, 201);
    const session = sessRes.json();
    assert.equal(session.status, 'DRAFT');
    assert.equal(session.operatorId, JAK_OPERATOR_ID);
    assert.equal(session.pilotId, pilotId);

    // 2. Add exercise with all 8 competency grades
    const exRes = await app!.inject({
      method: 'POST',
      url: `/sessions/${session.id}/exercises`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: {
        ordinal: 1,
        title: 'V1 cut, single-engine ILS',
        reference: 'OM-D §3.4.1',
        observableBehaviours: ['Maintains 5° bank into live engine'],
        competencyGrades: allEightGrades(),
      },
    });
    assert.equal(exRes.statusCode, 201);
    assert.ok(exRes.json().exerciseId);

    // 3. Sign off
    const signRes = await app!.inject({
      method: 'POST',
      url: `/sessions/${session.id}/sign-off`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: {
        signedByRole: 'TRE',
        statement: 'Pilot meets the required standard for OPC.',
        overallGrade: { scale: 'AS-S-MS-BS', value: 'S' },
      },
    });
    assert.equal(signRes.statusCode, 200);
    assert.equal(signRes.json().sessionId, session.id);
    assert.ok(signRes.json().signOffId);

    // 4. Verify GET returns SIGNED_OFF
    const read = await app!.inject({
      method: 'GET',
      url: `/sessions/${session.id}`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID },
    });
    assert.equal(read.statusCode, 200);
    assert.equal(read.json().status, 'SIGNED_OFF');
  });
});

describe('State machine guards', { skip }, () => {
  it('rejects exercises added to SIGNED_OFF session', async () => {
    // Create + sign off (with one exercise) so we can attempt to add another.
    const sess = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/sessions`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: { kind: 'LPC', venue: 'FFS', startedAt: new Date().toISOString() },
    });
    const sessionId = sess.json().id;

    await app!.inject({
      method: 'POST',
      url: `/sessions/${sessionId}/exercises`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: {
        ordinal: 1,
        title: 'RNP approach',
        reference: 'OM-D §3.4.2',
        competencyGrades: allEightGrades(),
      },
    });

    await app!.inject({
      method: 'POST',
      url: `/sessions/${sessionId}/sign-off`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: {
        signedByRole: 'TRE',
        statement: 'Meets standard.',
      },
    });

    // Try to add an exercise after sign-off
    const blocked = await app!.inject({
      method: 'POST',
      url: `/sessions/${sessionId}/exercises`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: {
        ordinal: 2,
        title: 'Should be blocked',
        reference: 'n/a',
        competencyGrades: allEightGrades(),
      },
    });
    assert.equal(blocked.statusCode, 409);
  });

  it('rejects sign-off when session has zero exercises', async () => {
    const sess = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/sessions`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: { kind: 'CRM_RECURRENT', venue: 'CLASSROOM', startedAt: new Date().toISOString() },
    });
    const sessionId = sess.json().id;

    const res = await app!.inject({
      method: 'POST',
      url: `/sessions/${sessionId}/sign-off`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: { signedByRole: 'TRE', statement: 'No exercises logged.' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('rejects a second sign-off on the same session', async () => {
    const sess = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/sessions`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: { kind: 'LINE_CHECK', venue: 'AIRCRAFT', startedAt: new Date().toISOString() },
    });
    const sessionId = sess.json().id;

    await app!.inject({
      method: 'POST',
      url: `/sessions/${sessionId}/exercises`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: {
        ordinal: 1,
        title: 'Line check sector',
        reference: 'OM-A §8.3',
        competencyGrades: allEightGrades(),
      },
    });
    await app!.inject({
      method: 'POST',
      url: `/sessions/${sessionId}/sign-off`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: { signedByRole: 'LCE', statement: 'Meets standard on line.' },
    });

    const second = await app!.inject({
      method: 'POST',
      url: `/sessions/${sessionId}/sign-off`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: { signedByRole: 'LCE', statement: 'Trying to sign again.' },
    });
    assert.equal(second.statusCode, 409);
  });
});

describe('CBTA invariant: exactly 8 unique competencies per exercise', { skip }, () => {
  it('rejects exercises with fewer than 8 competency grades', async () => {
    const sess = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/sessions`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: { kind: 'ITR_FFS', venue: 'FFS', startedAt: new Date().toISOString() },
    });
    const sessionId = sess.json().id;

    const res = await app!.inject({
      method: 'POST',
      url: `/sessions/${sessionId}/exercises`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: {
        ordinal: 1,
        title: 'Short grade set',
        reference: 'OM-D §3.4.3',
        competencyGrades: allEightGrades().slice(0, 3),
      },
    });
    assert.equal(res.statusCode, 400);
  });

  it('rejects exercises with duplicate competencies', async () => {
    const sess = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/sessions`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: { kind: 'ITR_FFS', venue: 'FFS', startedAt: new Date().toISOString() },
    });
    const sessionId = sess.json().id;

    const grades = allEightGrades();
    grades[7] = grades[0]!; // duplicate the first competency

    const res = await app!.inject({
      method: 'POST',
      url: `/sessions/${sessionId}/exercises`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: {
        ordinal: 1,
        title: 'Duplicate competency',
        reference: 'OM-D §3.4.4',
        competencyGrades: grades,
      },
    });
    assert.equal(res.statusCode, 400);
  });
});

describe('RLS cross-tenant isolation', { skip }, () => {
  it('I-Fly-scoped read cannot see a JAK session', async () => {
    const sess = await app!.inject({
      method: 'POST',
      url: `/pilots/${pilotId}/sessions`,
      headers: { 'x-demo-operator-id': JAK_OPERATOR_ID, 'content-type': 'application/json' },
      payload: { kind: 'OPC', venue: 'FFS', startedAt: new Date().toISOString() },
    });
    const sessionId = sess.json().id;

    const blocked = await app!.inject({
      method: 'GET',
      url: `/sessions/${sessionId}`,
      headers: { 'x-demo-operator-id': IFLY_OPERATOR_ID },
    });
    assert.equal(blocked.statusCode, 404);
  });
});

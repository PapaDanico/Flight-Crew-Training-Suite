import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEMO_OPERATORS,
  DEMO_FLEETS,
  DEMO_PILOTS,
  ICAO_COMPETENCY,
  buildDemoCurrencyRecords,
  buildDemoSessions,
  indexCurrencyByPilotAndKind,
  currencyMapKey,
  tallyCompetencies,
  CURRENCY_CATALOG,
  ITR_NA_ELIGIBLE,
  ITR_PHASES,
  statusFor,
  type IsoDate,
} from '../src/index.js';

const ASOF = new Date('2026-05-24T00:00:00Z');
const ASOF_ISO = ASOF.toISOString().slice(0, 10) as IsoDate;

describe('demo fixtures', () => {
  it('seeds two operators with stable ids', () => {
    assert.equal(DEMO_OPERATORS.length, 2);
    assert.equal(DEMO_OPERATORS[0]!.shortCode, 'JAK-DEMO');
    assert.equal(DEMO_OPERATORS[1]!.shortCode, 'IFLY-DEMO');
  });

  it('seeds six pilots: F70/100 production demo (4) at I-Fly + B737 preview demo (2) at JAK', () => {
    assert.equal(DEMO_PILOTS.length, 6);
    const byOperator = new Map<string, number>();
    for (const p of DEMO_PILOTS) {
      byOperator.set(p.operatorId, (byOperator.get(p.operatorId) ?? 0) + 1);
    }
    assert.deepEqual(Array.from(byOperator.values()).sort(), [2, 4]);
  });

  it('every pilot has a fleet that belongs to its operator', () => {
    const fleetById = new Map(DEMO_FLEETS.map((f) => [f.id, f]));
    for (const p of DEMO_PILOTS) {
      const fleet = fleetById.get(p.fleetId);
      assert.ok(fleet, `pilot ${p.fullName} references missing fleet`);
      assert.equal(fleet!.operatorId, p.operatorId, `fleet/operator mismatch for ${p.fullName}`);
    }
  });

  it('uses the phonetic-alphabet demo naming pattern', () => {
    for (const p of DEMO_PILOTS) {
      assert.match(
        p.fullName,
        /(Alpha One|Bravo Two|Charlie Three|Delta Four|Echo Five|Foxtrot Six)/,
      );
      assert.match(p.licenceNumber, /^KCAA\/DEMO\//);
    }
  });
});

describe('buildDemoCurrencyRecords', () => {
  it('is reproducible given the same asOf', () => {
    const a = buildDemoCurrencyRecords(ASOF);
    const b = buildDemoCurrencyRecords(ASOF);
    assert.equal(a.length, b.length);
    for (let i = 0; i < a.length; i += 1) {
      assert.deepEqual(a[i], b[i]);
    }
  });

  it('emits NO record for ITR-eligible kinds when pilot is in ITR', () => {
    const records = buildDemoCurrencyRecords(ASOF);
    const itrPilots = DEMO_PILOTS.filter((p) => ITR_PHASES.has(p.phase));
    assert.ok(itrPilots.length > 0, 'demo must include at least one ITR pilot');
    for (const pilot of itrPilots) {
      for (const kind of ITR_NA_ELIGIBLE) {
        const found = records.find((r) => r.pilotId === pilot.id && r.kind === kind);
        assert.equal(
          found,
          undefined,
          `${pilot.fullName} (phase ${pilot.phase}) must not have a ${kind} record in fixtures`,
        );
      }
    }
  });

  it('emits a record for medical and licence on ITR pilots (audit §2.2)', () => {
    const records = buildDemoCurrencyRecords(ASOF);
    const itrPilots = DEMO_PILOTS.filter((p) => ITR_PHASES.has(p.phase));
    for (const pilot of itrPilots) {
      for (const requiredKind of [
        'class1Medical',
        'atplCpl',
        'elpLevel',
        'passportVisa',
      ] as const) {
        const found = records.find((r) => r.pilotId === pilot.id && r.kind === requiredKind);
        assert.ok(found, `${pilot.fullName} must have a ${requiredKind} record even during ITR`);
      }
    }
  });

  it('renders at least one CAUTION, one ACTION, and one EXPIRED status for demo coverage', () => {
    const records = buildDemoCurrencyRecords(ASOF);
    const index = indexCurrencyByPilotAndKind(records);

    const seen = new Set<string>();
    for (const pilot of DEMO_PILOTS) {
      for (const c of CURRENCY_CATALOG) {
        const rec = index.get(currencyMapKey(pilot.id, c.kind));
        const status = statusFor({
          kind: c.kind,
          phase: pilot.phase,
          validTo: rec?.validTo,
          asOf: ASOF_ISO,
        });
        seen.add(status);
      }
    }
    assert.ok(seen.has('CURRENT'), 'demo must surface CURRENT');
    assert.ok(seen.has('CAUTION'), 'demo must surface CAUTION');
    assert.ok(seen.has('ACTION'), 'demo must surface ACTION');
    assert.ok(seen.has('EXPIRED'), 'demo must surface EXPIRED');
    assert.ok(seen.has('NOT_APPLICABLE'), 'demo must surface NOT_APPLICABLE');
  });
});

describe('buildDemoSessions', () => {
  it('seeds at least 4 sessions covering DRAFT and SIGNED_OFF states', () => {
    const { sessions } = buildDemoSessions(ASOF);
    assert.ok(sessions.length >= 4, 'expected at least 4 demo sessions');
    const statuses = new Set(sessions.map((s) => s.status));
    assert.ok(statuses.has('DRAFT'), 'must include a DRAFT session');
    assert.ok(statuses.has('SIGNED_OFF'), 'must include a SIGNED_OFF session');
  });

  it('every exercise grades ALL eight ICAO competencies', () => {
    const { exercises } = buildDemoSessions(ASOF);
    assert.ok(exercises.length > 0);
    for (const ex of exercises) {
      assert.equal(
        ex.competencyGrades.length,
        ICAO_COMPETENCY.length,
        `exercise "${ex.title}" must grade all ${ICAO_COMPETENCY.length} competencies, got ${ex.competencyGrades.length}`,
      );
      const observed = new Set(ex.competencyGrades.map((g) => g.competency));
      assert.equal(observed.size, ICAO_COMPETENCY.length, 'no duplicate competencies per exercise');
    }
  });

  it('SIGNED_OFF sessions have a SignOff row with matching session id', () => {
    const { sessions, signOffs } = buildDemoSessions(ASOF);
    const signedOff = sessions.filter((s) => s.status === 'SIGNED_OFF');
    for (const s of signedOff) {
      const matching = signOffs.find((so) => so.sessionId === s.id);
      assert.ok(matching, `session ${s.id} is SIGNED_OFF but has no SignOff row`);
    }
  });

  it('DRAFT sessions do NOT carry a SignOff row', () => {
    const { sessions, signOffs } = buildDemoSessions(ASOF);
    const drafts = sessions.filter((s) => s.status === 'DRAFT');
    for (const s of drafts) {
      const found = signOffs.find((so) => so.sessionId === s.id);
      assert.equal(found, undefined, `DRAFT session ${s.id} must not have a SignOff`);
    }
  });

  it('tallyCompetencies sums grades into AS/S/MS/BS + NOT_OBSERVED buckets', () => {
    const { exercises } = buildDemoSessions(ASOF);
    const firstSessionExercises = exercises.filter((e) => e.sessionId === exercises[0]!.sessionId);
    const tally = tallyCompetencies(firstSessionExercises);
    for (const c of ICAO_COMPETENCY) {
      const row = tally[c];
      const total = row.AS + row.S + row.MS + row.BS + row.NOT_OBSERVED;
      assert.equal(total, firstSessionExercises.length, `tally for ${c} must equal exercise count`);
    }
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEMO_OPERATORS,
  DEMO_FLEETS,
  DEMO_PILOTS,
  buildDemoCurrencyRecords,
  indexCurrencyByPilotAndKind,
  currencyMapKey,
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

  it('seeds four pilots split across operators', () => {
    assert.equal(DEMO_PILOTS.length, 4);
    const byOperator = new Map<string, number>();
    for (const p of DEMO_PILOTS) {
      byOperator.set(p.operatorId, (byOperator.get(p.operatorId) ?? 0) + 1);
    }
    assert.deepEqual(Array.from(byOperator.values()).sort(), [2, 2]);
  });

  it('every pilot has a fleet that belongs to its operator', () => {
    const fleetById = new Map(DEMO_FLEETS.map((f) => [f.id, f]));
    for (const p of DEMO_PILOTS) {
      const fleet = fleetById.get(p.fleetId);
      assert.ok(fleet, `pilot ${p.fullName} references missing fleet`);
      assert.equal(fleet!.operatorId, p.operatorId, `fleet/operator mismatch for ${p.fullName}`);
    }
  });

  it('uses the Capt. Alpha One / F/O Bravo Two demo naming pattern', () => {
    for (const p of DEMO_PILOTS) {
      assert.match(p.fullName, /(Alpha One|Bravo Two|Charlie Three|Delta Four)/);
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

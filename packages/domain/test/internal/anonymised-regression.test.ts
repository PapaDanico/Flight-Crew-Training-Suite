import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { statusFor } from '../../src/index.js';
import { ANONYMISED_CURRENCY_CASES, REGRESSION_AS_OF } from './jetways-anonymised.fixture.js';

/**
 * Regression: statusFor() against a realistically-shaped, real-world expiry
 * distribution (pseudonymised — see the fixture header for governance).
 *
 * This complements the fabricated demo fixtures: those prove the demo *looks*
 * right; this proves the status maths is correct against the messy date
 * distribution a real operator actually presents (mid-month expiries, items
 * just over/under the 30- and 90-day edges, already-expired items).
 */
describe('currency status — anonymised real-shape regression', () => {
  for (const c of ANONYMISED_CURRENCY_CASES) {
    it(`${c.pilotId}: medical → ${c.expect.class1Medical}, OPC → ${c.expect.opc}`, () => {
      const medical = statusFor({
        kind: 'class1Medical',
        phase: c.phase,
        validTo: c.class1MedicalExpiry,
        asOf: REGRESSION_AS_OF,
      });
      const opc = statusFor({
        kind: 'opc',
        phase: c.phase,
        validTo: c.opcDue,
        asOf: REGRESSION_AS_OF,
      });
      assert.equal(medical, c.expect.class1Medical, `${c.pilotId} medical`);
      assert.equal(opc, c.expect.opc, `${c.pilotId} OPC`);
    });
  }

  it('the regression set exercises EXPIRED, ACTION, CAUTION and CURRENT', () => {
    const seen = new Set(
      ANONYMISED_CURRENCY_CASES.flatMap((c) => [c.expect.class1Medical, c.expect.opc]),
    );
    for (const bucket of ['EXPIRED', 'ACTION', 'CAUTION', 'CURRENT'] as const) {
      assert.ok(seen.has(bucket), `regression set must include a ${bucket} case`);
    }
  });
});

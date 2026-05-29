import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  KCARS_2025_INSTRUMENTS,
  LN_40_2026,
  LN_42_2026,
  SIXTH_SCHEDULE_PENALTIES,
} from '../src/kcars-2025.js';

/**
 * Locks the primary-source reconciliation. All seven binding-law notices are
 * confirmed against the official Kenya Law record (LN 40/42 also against the
 * gazette PDFs on file), so each carries an authoritativeUrl and is verified.
 * See kcars-2025-alignment.md §1.6.
 */
describe('KCARs 2025 instrument verification state', () => {
  it('marks all seven binding-law notices primary-source-verified', () => {
    const verified = KCARS_2025_INSTRUMENTS.filter((i) => i.primarySourceVerified === true)
      .map((i) => i.instrumentId)
      .sort();
    assert.deepEqual(verified, [
      'LN-29-2026',
      'LN-30-2026',
      'LN-31-2026',
      'LN-37-2026',
      'LN-40-2026',
      'LN-41-2026',
      'LN-42-2026',
    ]);
  });

  it('gives every verified instrument an authoritative (Kenya Law) URL', () => {
    for (const i of KCARS_2025_INSTRUMENTS) {
      assert.match(
        i.authoritativeUrl ?? '',
        /kenyalaw\.org\/akn\/ke\/act\/ln\/2026\//,
        `${i.instrumentId} must cite its Kenya Law record`,
      );
    }
  });

  it('locks the corrected gazette effective dates (LN 37/40/41 are 6 Mar, not 3 Mar)', () => {
    const date = (id: string) =>
      KCARS_2025_INSTRUMENTS.find((i) => i.instrumentId === id)?.effectiveDate;
    assert.equal(date('LN-29-2026'), '2026-03-03');
    assert.equal(date('LN-30-2026'), '2026-03-03');
    assert.equal(date('LN-31-2026'), '2026-03-03');
    assert.equal(date('LN-37-2026'), '2026-03-06');
    assert.equal(date('LN-40-2026'), '2026-03-06');
    assert.equal(date('LN-41-2026'), '2026-03-06');
    assert.equal(LN_42_2026.effectiveDate, '2026-03-06');
    assert.equal(LN_42_2026.primarySourceVerified, true);
    assert.equal(LN_40_2026.primarySourceVerified, true);
  });
});

/** Verified verbatim against LN 42 r. 82 / Sixth Schedule. */
describe('Sixth Schedule penalties', () => {
  it('matches the gazetted A/B fine and imprisonment ceilings', () => {
    assert.equal(SIXTH_SCHEDULE_PENALTIES.reg, '82');
    assert.equal(SIXTH_SCHEDULE_PENALTIES.primarySourceVerified, true);
    assert.equal(SIXTH_SCHEDULE_PENALTIES.aClass.maxFineKsh, 1_000_000);
    assert.equal(SIXTH_SCHEDULE_PENALTIES.aClass.maxImprisonmentYears, 1);
    assert.equal(SIXTH_SCHEDULE_PENALTIES.bClass.maxFineKsh, 2_000_000);
    assert.equal(SIXTH_SCHEDULE_PENALTIES.bClass.maxImprisonmentYears, 3);
  });
});

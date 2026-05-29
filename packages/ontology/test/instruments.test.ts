import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  KCARS_2025_INSTRUMENTS,
  LN_40_2026,
  LN_42_2026,
  SIXTH_SCHEDULE_PENALTIES,
} from '../src/kcars-2025.js';

/**
 * Locks the primary-source reconciliation. Of the binding-law set named in
 * CLAUDE.md, only the notices actually present in the supplied gazette PDFs
 * (LN 40, LN 42) are marked verified; the rest stay provisional until their
 * specific notices are supplied. See kcars-2025-alignment.md §3.
 */
describe('KCARs 2025 instrument verification state', () => {
  it('marks only the gazette-confirmed notices as primary-source-verified', () => {
    const verified = KCARS_2025_INSTRUMENTS.filter((i) => i.primarySourceVerified === true)
      .map((i) => i.instrumentId)
      .sort();
    assert.deepEqual(verified, ['LN-40-2026', 'LN-42-2026']);
  });

  it('flags every unverified instrument with a note explaining why', () => {
    for (const i of KCARS_2025_INSTRUMENTS) {
      if (i.primarySourceVerified !== true) {
        assert.ok(
          i.notes && i.notes.length > 10,
          `${i.instrumentId} must carry a provisional-status note`,
        );
      }
    }
  });

  it('keeps the verified anchors', () => {
    assert.equal(LN_42_2026.primarySourceVerified, true);
    assert.equal(LN_42_2026.effectiveDate, '2026-03-06');
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

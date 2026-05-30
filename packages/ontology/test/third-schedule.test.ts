import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LN_42_2026,
  THIRD_SCHEDULE,
  THIRD_SCHEDULE_SECTIONS,
  THIRD_SCHEDULE_SECTION_21_CLAUSES,
} from '../src/kcars-2025.js';

/**
 * Locks the LN 42/2026 Third Schedule transcription against the gazetted text
 * (Kenya Gazette Supplement No. 52, 6 March 2026). If a future edit drifts the
 * counts or the anchor clauses, this fails.
 */
describe('LN 42/2026 Third Schedule', () => {
  it('has the four gazetted sections with the correct clause counts', () => {
    const byRef = new Map(THIRD_SCHEDULE_SECTIONS.map((s) => [s.ref, s]));
    assert.equal(byRef.get('§2.1')?.title, 'General');
    assert.equal(byRef.get('§2.1')?.clauses.length, 39);
    assert.equal(byRef.get('§2.2')?.title, 'Aircraft operating information');
    assert.equal(byRef.get('§2.2')?.clauses.length, 13);
    assert.equal(byRef.get('§2.3')?.title, 'Routes, aerodromes and heliports');
    assert.equal(byRef.get('§2.3')?.clauses.length, 6);
    assert.equal(byRef.get('§2.4')?.title, 'Training');
    assert.equal(byRef.get('§2.4')?.clauses.length, 3);
  });

  it('totals 61 clauses and is anchored to LN 42/2026', () => {
    assert.equal(THIRD_SCHEDULE.totalClauseCount, 61);
    assert.equal(THIRD_SCHEDULE.instrument, LN_42_2026);
    assert.equal(THIRD_SCHEDULE.reference, 'rr. 30(1) and 31(2)');
  });

  it('places the anchor clauses where the gazette puts them', () => {
    const find = (ref: string) =>
      THIRD_SCHEDULE_SECTIONS.flatMap((s) => s.clauses).find((c) => c.shortRef === ref);
    assert.match(find('§2.1.2')?.subject ?? '', /duty time/i);
    assert.match(find('§2.1.25')?.subject ?? '', /stabilised approach/i);
    assert.match(find('§2.1.30')?.subject ?? '', /upset prevention/i);
    assert.match(find('§2.1.35')?.subject ?? '', /dangerous goods/i);
    // §2.2.4 is flight-planning data — NOT CRM (a prior mislabel).
    assert.match(find('§2.2.4')?.subject ?? '', /flight planning data/i);
    assert.doesNotMatch(find('§2.2.4')?.subject ?? '', /\bCRM\b/);
    // CRM lives under the §2.4 training programmes.
    assert.match(find('§2.4.1')?.subject ?? '', /flight crew training programme/i);
  });

  it('has unique, well-formed clause refs with all subjects populated', () => {
    const all = THIRD_SCHEDULE_SECTIONS.flatMap((s) => s.clauses);
    const refs = new Set(all.map((c) => c.shortRef));
    assert.equal(refs.size, all.length, 'clause refs must be unique');
    for (const c of all) {
      assert.match(c.shortRef, /^§2\.[1-4]\.\d+$/);
      assert.equal(c.pendingPrimarySource, false);
      assert.ok(c.subject && c.subject.length > 5, `${c.shortRef} must have a subject`);
    }
  });

  it('keeps the §2.1 back-compat alias pointing at the General section', () => {
    assert.equal(THIRD_SCHEDULE_SECTION_21_CLAUSES.length, 39);
    assert.equal(THIRD_SCHEDULE_SECTION_21_CLAUSES[24]?.shortRef, '§2.1.25');
  });
});

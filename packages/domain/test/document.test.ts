import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  REG_17_3_LEAD_DAYS,
  assessSubmissionReadiness,
  buildLetterOfEffectivePages,
  calculateSubmissionDeadline,
  diffDocumentVersions,
  type DocumentPage,
} from '../src/document.js';
import type { DocumentVersionId, IsoDate, IsoDateTime } from '../src/branded.js';

describe('calculateSubmissionDeadline (Reg 17(3))', () => {
  it('subtracts exactly 30 days from the planned implementation date', () => {
    const planned = new Date('2026-06-01T00:00:00Z');
    const deadline = calculateSubmissionDeadline(planned);
    assert.equal(deadline.toISOString().slice(0, 10), '2026-05-02');
    assert.equal(REG_17_3_LEAD_DAYS, 30);
  });

  it('does not drift across a month/timezone boundary (computed in UTC)', () => {
    const planned = new Date('2026-03-06T00:00:00Z');
    const deadline = calculateSubmissionDeadline(planned);
    assert.equal(deadline.toISOString().slice(0, 10), '2026-02-04');
  });

  it('does not mutate the input date', () => {
    const planned = new Date('2026-06-01T00:00:00Z');
    const snapshot = planned.toISOString();
    calculateSubmissionDeadline(planned);
    assert.equal(planned.toISOString(), snapshot);
  });
});

describe('assessSubmissionReadiness (Reg 17(3))', () => {
  it('is on time with room to spare well before the deadline', () => {
    const r = assessSubmissionReadiness({
      plannedImplementation: '2026-06-01' as IsoDate,
      asOf: '2026-04-15' as IsoDate,
    });
    assert.equal(r.submissionDeadline, '2026-05-02');
    assert.equal(r.onTime, true);
    assert.equal(r.requiresOverride, false);
    assert.ok(r.daysUntilDeadline > 0);
  });

  it('is exactly on time on the deadline day', () => {
    const r = assessSubmissionReadiness({
      plannedImplementation: '2026-06-01' as IsoDate,
      asOf: '2026-05-02' as IsoDate,
    });
    assert.equal(r.daysUntilDeadline, 0);
    assert.equal(r.onTime, true);
    assert.equal(r.requiresOverride, false);
  });

  it('requires an override once inside the 30-day window', () => {
    const r = assessSubmissionReadiness({
      plannedImplementation: '2026-06-01' as IsoDate,
      asOf: '2026-05-20' as IsoDate,
    });
    assert.equal(r.onTime, false);
    assert.equal(r.requiresOverride, true);
    assert.ok(r.daysUntilDeadline < 0);
  });
});

describe('buildLetterOfEffectivePages', () => {
  const page = (n: number, rev: string, revised: string): DocumentPage => ({
    documentVersionId: 'dv-1' as DocumentVersionId,
    pageNumber: n,
    revisionLabel: rev,
    lastRevisedAt: revised as IsoDateTime,
    contentHash: `h${n}`,
  });

  it('orders by page number and takes the latest revision as the effective date', () => {
    const lep = buildLetterOfEffectivePages([
      page(3, 'Rev 2', '2026-05-10T00:00:00.000Z'),
      page(1, 'Rev 1', '2026-04-01T00:00:00.000Z'),
      page(2, 'Rev 4', '2026-05-25T00:00:00.000Z'),
    ]);
    assert.deepEqual(
      lep.rows.map((r) => r.pageNumber),
      [1, 2, 3],
    );
    assert.equal(lep.pageCount, 3);
    assert.equal(lep.effectiveDate, '2026-05-25');
  });

  it('returns a null effective date for an empty document', () => {
    const lep = buildLetterOfEffectivePages([]);
    assert.equal(lep.pageCount, 0);
    assert.equal(lep.effectiveDate, null);
  });
});

describe('diffDocumentVersions', () => {
  const pg = (n: number, rev: string, hash: string): DocumentPage => ({
    documentVersionId: 'dv' as DocumentVersionId,
    pageNumber: n,
    revisionLabel: rev,
    lastRevisedAt: '2026-05-01T00:00:00.000Z' as IsoDateTime,
    contentHash: hash,
  });

  it('classifies added, removed, revised and unchanged pages', () => {
    const from = [pg(1, 'Rev 1', 'h1'), pg(2, 'Rev 1', 'h2'), pg(3, 'Rev 1', 'h3')];
    const to = [pg(1, 'Rev 1', 'h1'), pg(2, 'Rev 2', 'h2b'), pg(4, 'Rev 1', 'h4')];
    const diff = diffDocumentVersions(from, to);
    const byPage = new Map(diff.pages.map((p) => [p.pageNumber, p.kind]));
    assert.equal(byPage.get(1), 'UNCHANGED');
    assert.equal(byPage.get(2), 'REVISED');
    assert.equal(byPage.get(3), 'REMOVED');
    assert.equal(byPage.get(4), 'ADDED');
    assert.deepEqual(diff.summary, {
      added: 1,
      removed: 1,
      revised: 1,
      unchanged: 1,
      total: 4,
    });
  });

  it('treats a revision-label move with the same hash as REVISED', () => {
    const diff = diffDocumentVersions([pg(1, 'Rev 1', 'h1')], [pg(1, 'Rev 2', 'h1')]);
    assert.equal(diff.pages[0]?.kind, 'REVISED');
    assert.equal(diff.pages[0]?.fromRevisionLabel, 'Rev 1');
    assert.equal(diff.pages[0]?.toRevisionLabel, 'Rev 2');
  });

  it('orders pages and is empty-safe', () => {
    assert.deepEqual(diffDocumentVersions([], []).pages, []);
    const diff = diffDocumentVersions([], [pg(2, 'Rev 1', 'h'), pg(1, 'Rev 1', 'h')]);
    assert.deepEqual(
      diff.pages.map((p) => p.pageNumber),
      [1, 2],
    );
    assert.equal(diff.summary.added, 2);
  });
});

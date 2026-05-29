import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { REG_17_3_LEAD_DAYS, calculateSubmissionDeadline } from '../src/document.js';

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

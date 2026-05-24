import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { STATUS_THRESHOLDS, daysBetween, mayBeNotApplicable, statusFor } from '../src/currency.js';
import type { IsoDate } from '../src/branded.js';

const ASOF = '2026-05-24' as IsoDate;

function offsetIso(days: number): IsoDate {
  const d = new Date(ASOF);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10) as IsoDate;
}

describe('daysBetween', () => {
  it('positive when target is in the future', () => {
    assert.equal(daysBetween(ASOF, offsetIso(10)), 10);
  });

  it('negative when target has passed', () => {
    assert.equal(daysBetween(ASOF, offsetIso(-5)), -5);
  });
});

describe('statusFor', () => {
  it('returns CURRENT for validity > 90 days', () => {
    assert.equal(
      statusFor({ kind: 'class1Medical', phase: 'Line', validTo: offsetIso(180), asOf: ASOF }),
      'CURRENT',
    );
  });

  it('returns CAUTION for 31-90 days', () => {
    assert.equal(
      statusFor({
        kind: 'class1Medical',
        phase: 'Line',
        validTo: offsetIso(STATUS_THRESHOLDS.cautionMaxDays),
        asOf: ASOF,
      }),
      'CAUTION',
    );
    assert.equal(
      statusFor({ kind: 'class1Medical', phase: 'Line', validTo: offsetIso(60), asOf: ASOF }),
      'CAUTION',
    );
  });

  it('returns ACTION for 1-30 days', () => {
    assert.equal(
      statusFor({
        kind: 'class1Medical',
        phase: 'Line',
        validTo: offsetIso(STATUS_THRESHOLDS.actionMaxDays),
        asOf: ASOF,
      }),
      'ACTION',
    );
    assert.equal(
      statusFor({ kind: 'class1Medical', phase: 'Line', validTo: offsetIso(5), asOf: ASOF }),
      'ACTION',
    );
  });

  it('returns EXPIRED at or before asOf', () => {
    assert.equal(
      statusFor({ kind: 'class1Medical', phase: 'Line', validTo: offsetIso(0), asOf: ASOF }),
      'EXPIRED',
    );
    assert.equal(
      statusFor({ kind: 'class1Medical', phase: 'Line', validTo: offsetIso(-1), asOf: ASOF }),
      'EXPIRED',
    );
  });

  it('returns NOT_APPLICABLE for type-rating-derivative kinds during ITR', () => {
    assert.equal(statusFor({ kind: 'opc', phase: 'ITR_FFS', asOf: ASOF }), 'NOT_APPLICABLE');
    assert.equal(statusFor({ kind: 'lpc', phase: 'ITR_Ground', asOf: ASOF }), 'NOT_APPLICABLE');
    assert.equal(statusFor({ kind: 'lineCheck', phase: 'ITR_FBT', asOf: ASOF }), 'NOT_APPLICABLE');
  });

  it('does NOT return NOT_APPLICABLE for medical or licence during ITR', () => {
    // This is the Phase-0 audit §2.2 fix made unrepresentable.
    assert.equal(
      statusFor({ kind: 'class1Medical', phase: 'ITR_FFS', asOf: ASOF }),
      'EXPIRED',
      'medical without a record is EXPIRED, never N/A — required regardless of phase',
    );
    assert.equal(
      statusFor({ kind: 'atplCpl', phase: 'ITR_Ground', asOf: ASOF }),
      'EXPIRED',
      'ATPL/CPL without a record is EXPIRED, never N/A',
    );
    assert.equal(statusFor({ kind: 'elpLevel', phase: 'ITR_FFS', asOf: ASOF }), 'EXPIRED');
    assert.equal(statusFor({ kind: 'passportVisa', phase: 'ITR_FFS', asOf: ASOF }), 'EXPIRED');
  });
});

describe('mayBeNotApplicable', () => {
  it('returns true only when phase is ITR AND kind is ITR-eligible', () => {
    assert.equal(mayBeNotApplicable('opc', 'ITR_Ground'), true);
    assert.equal(mayBeNotApplicable('opc', 'Line'), false);
    assert.equal(mayBeNotApplicable('class1Medical', 'ITR_Ground'), false);
    assert.equal(mayBeNotApplicable('atplCpl', 'ITR_FFS'), false);
    assert.equal(mayBeNotApplicable('uprt', 'Line'), false);
  });
});

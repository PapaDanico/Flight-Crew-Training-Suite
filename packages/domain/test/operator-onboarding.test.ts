import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_OPERATOR_CONFIG,
  mergeOperatorConfig,
  resolveOperatorOnboarding,
  type OperatorOnboardingSpec,
} from '../src/operator.js';
import type { IsoDateTime, OperatorId } from '../src/branded.js';

const ID = '33333333-3333-3333-3333-333333333333' as OperatorId;
const NOW = '2026-05-29T00:00:00.000Z' as IsoDateTime;

const valid: OperatorOnboardingSpec = {
  legalName: '  Skyward Aviation Ltd  ',
  tradingName: 'Skyward',
  shortCode: 'SKY-DEMO',
  aocNumber: 'KE-AOC-2026-099',
  accountableManagerName: 'Capt. A. Manager',
  accountableManagerEmail: 'am@skyward.example',
};

describe('resolveOperatorOnboarding', () => {
  it('produces an active, KE operator with trimmed fields and default config', () => {
    const op = resolveOperatorOnboarding(valid, { id: ID, now: NOW });
    assert.equal(op.id, ID);
    assert.equal(op.legalName, 'Skyward Aviation Ltd'); // trimmed
    assert.equal(op.countryIso2, 'KE');
    assert.equal(op.status, 'active');
    assert.equal(op.createdAt, NOW);
    assert.equal(op.updatedAt, NOW);
    assert.deepEqual(op.config, DEFAULT_OPERATOR_CONFIG());
    assert.equal('odpcRegistrationNumber' in op, false);
  });

  it('applies config overrides on top of the defaults (deep per sub-object)', () => {
    const op = resolveOperatorOnboarding(
      {
        ...valid,
        configOverrides: {
          stabilisedApproachGate: { imcFeetAal: 1500 },
          gradingScale: 'ICAO-1-5',
          opSpecs: { catII: true, catIII: true },
        },
      },
      { id: ID, now: NOW },
    );
    assert.equal(op.config.stabilisedApproachGate.imcFeetAal, 1500);
    assert.equal(op.config.stabilisedApproachGate.vmcFeetAal, 500); // default kept
    assert.equal(op.config.gradingScale, 'ICAO-1-5');
    assert.equal(op.config.opSpecs.catII, true);
    assert.equal(op.config.opSpecs.rvsm, true); // default kept
  });

  it('rejects bad short codes and emails with clear errors', () => {
    assert.throws(
      () => resolveOperatorOnboarding({ ...valid, shortCode: 'x' }, { id: ID, now: NOW }),
      /shortCode/,
    );
    assert.throws(
      () => resolveOperatorOnboarding({ ...valid, shortCode: 'has space' }, { id: ID, now: NOW }),
      /shortCode/,
    );
    assert.throws(
      () =>
        resolveOperatorOnboarding(
          { ...valid, accountableManagerEmail: 'not-an-email' },
          { id: ID, now: NOW },
        ),
      /email/,
    );
    assert.throws(
      () => resolveOperatorOnboarding({ ...valid, aocNumber: '   ' }, { id: ID, now: NOW }),
      /aocNumber/,
    );
  });

  it('carries a trimmed ODPC registration number when supplied', () => {
    const op = resolveOperatorOnboarding(
      { ...valid, odpcRegistrationNumber: '  ODPC-12345  ' },
      { id: ID, now: NOW },
    );
    assert.equal(op.odpcRegistrationNumber, 'ODPC-12345');
  });
});

describe('mergeOperatorConfig', () => {
  it('returns the defaults when no overrides are given', () => {
    assert.deepEqual(mergeOperatorConfig(), DEFAULT_OPERATOR_CONFIG());
  });
});

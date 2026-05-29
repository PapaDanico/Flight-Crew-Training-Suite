import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { IsoDate, Operator } from '@dnca/domain';
import { buildKcaaTransmittalLetter } from '../src/kcaa-transmittal-letter.js';

const operator: Operator = {
  id: '11111111-1111-1111-1111-111111111111' as Operator['id'],
  legalName: 'Jubba Airways Kenya (Demo)',
  tradingName: 'JAK Demo',
  shortCode: 'JAK-DEMO',
  aocNumber: 'KE-AOC-DEMO-001',
  countryIso2: 'KE',
};

const base = {
  operator,
  document: { title: 'Operations Manual Part A', shortCode: 'OM-A', kind: 'OM_A' as const },
  version: { versionLabel: 'Rev 7' },
  signatory: { name: 'Capt. D. Ngʼongʼa', title: 'Head of Training' },
  generatedAt: new Date('2026-04-15T09:00:00Z'),
};

describe('buildKcaaTransmittalLetter', () => {
  it('cites Reg 17(3), the deadline and the document, and is on time well ahead', () => {
    const letter = buildKcaaTransmittalLetter({
      ...base,
      plannedImplementation: '2026-06-01' as IsoDate,
      asOf: '2026-04-15' as IsoDate,
    });
    assert.match(letter.regCitation, /17\(3\)/);
    assert.equal(letter.readiness.submissionDeadline, '2026-05-02');
    assert.equal(letter.readiness.requiresOverride, false);
    assert.equal(letter.overrideWarning, null);
    assert.match(letter.subject, /OM-A/);
    assert.match(letter.subject, /Rev 7/);
    assert.equal(letter.aocNumber, 'KE-AOC-DEMO-001');
    assert.equal(letter.reference, 'JAK-DEMO/OM-A/Rev 7');
    assert.ok(letter.bodyParagraphs.some((p) => p.includes('2026-06-01')));
    assert.ok(letter.bodyParagraphs.some((p) => /not be implemented before/i.test(p)));
  });

  it('emits an override warning when inside the 30-day window', () => {
    const letter = buildKcaaTransmittalLetter({
      ...base,
      plannedImplementation: '2026-06-01' as IsoDate,
      asOf: '2026-05-20' as IsoDate,
    });
    assert.equal(letter.readiness.requiresOverride, true);
    assert.ok(letter.overrideWarning);
    assert.match(letter.overrideWarning ?? '', /thirty-day window/);
  });

  it('summarises the Letter of Effective Pages when provided', () => {
    const letter = buildKcaaTransmittalLetter({
      ...base,
      plannedImplementation: '2026-06-01' as IsoDate,
      asOf: '2026-04-15' as IsoDate,
      lep: { rows: [], pageCount: 12, effectiveDate: '2026-04-10' as IsoDate },
    });
    assert.ok(letter.lepSummary);
    assert.match(letter.lepSummary ?? '', /12 effective pages/);
    assert.match(letter.lepSummary ?? '', /2026-04-10/);
  });
});

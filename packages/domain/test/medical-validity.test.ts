import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { class1MedicalValidityMonths } from '../src/currency-catalog.js';

/** KCARs LN 50/2026 (Personnel Licensing) — Class 1 medical validity by age. */
describe('class1MedicalValidityMonths', () => {
  it('is 12 months under 40', () => {
    assert.equal(class1MedicalValidityMonths(25), 12);
    assert.equal(class1MedicalValidityMonths(39), 12);
  });
  it('is 6 months at 40 or over (and at 60+)', () => {
    assert.equal(class1MedicalValidityMonths(40), 6);
    assert.equal(class1MedicalValidityMonths(55), 6);
    assert.equal(class1MedicalValidityMonths(62), 6);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEMO_OM_MAPPINGS,
  DEMO_OPERATORS,
  DEMO_PILOTS,
  buildDemoCurrencyRecords,
  type IsoDate,
} from '@dnca/domain';
import { KCARS_2025_ALL_INSTRUMENTS } from '@dnca/ontology';
import { buildComplianceEvidencePack } from '../src/compliance-evidence-pack.js';
import { buildCrewCurrencySnapshot } from '../src/crew-currency-snapshot.js';

const operator = DEMO_OPERATORS[0]!;
const asOfDate = new Date('2026-05-29T00:00:00Z');
const asOf = '2026-05-29' as IsoDate;
const records = buildDemoCurrencyRecords(asOfDate);

function pack() {
  return buildComplianceEvidencePack({
    operator,
    pilots: DEMO_PILOTS,
    currencyRecords: records,
    omMappings: DEMO_OM_MAPPINGS,
    instruments: KCARS_2025_ALL_INSTRUMENTS,
    asOf,
    generatedAt: asOfDate,
  });
}

describe('buildComplianceEvidencePack', () => {
  it('reports currency posture identical to the standalone snapshot', () => {
    const p = pack();
    const snapshot = buildCrewCurrencySnapshot({
      operator,
      pilots: DEMO_PILOTS.filter((pl) => pl.operatorId === operator.id),
      currencyRecords: records.filter((r) => r.operatorId === operator.id),
      asOf,
      generatedAt: asOfDate,
    });
    assert.deepEqual(p.currencyPosture.totals, snapshot.operatorTotals);
    assert.equal(p.currencyPosture.pilotCount, snapshot.pilots.length);
  });

  it('summarises provenance as all-verified with Kenya Law links', () => {
    const p = pack();
    assert.equal(p.provenance.totalCount, KCARS_2025_ALL_INSTRUMENTS.length);
    assert.equal(p.provenance.verifiedCount, p.provenance.totalCount);
    for (const row of p.provenance.rows) {
      assert.equal(row.verified, true);
      assert.match(row.authoritativeUrl ?? '', /kenyalaw\.org/);
    }
  });

  it('lists the four constituent artefacts and one file per scoped pilot', () => {
    const p = pack();
    const kinds = p.artifacts.map((a) => a.kind).sort();
    assert.deepEqual(kinds, [
      'crew-currency-snapshot',
      'kcaa-transmittal',
      'om-cross-reference-matrix',
      'pilot-training-file',
    ]);
    for (const a of p.artifacts)
      assert.match(a.href, new RegExp(`operatorId=${operator.id}|pilotId=`));
    const scoped = DEMO_PILOTS.filter((pl) => pl.operatorId === operator.id);
    assert.equal(p.pilotFiles.length, scoped.length);
    assert.ok(p.pilotFiles.every((f) => f.href.includes('pilotId=')));
  });

  it('reports OM coverage from the matrix (61 Third Schedule clauses)', () => {
    const p = pack();
    assert.equal(p.omCoverage.totalClauses, 61);
    assert.equal(p.omCoverage.mapped + p.omCoverage.unmapped, 61);
  });

  it('carries the retention / audit / DPA statements', () => {
    const p = pack();
    const headings = p.statements.map((s) => s.heading);
    assert.ok(headings.includes('Records retention'));
    assert.ok(headings.includes('Audit integrity'));
    assert.ok(headings.includes('Data protection'));
  });
});

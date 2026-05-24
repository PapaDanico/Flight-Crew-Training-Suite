import type { IsoDate, OmCrossReferenceMapping, Operator } from '@dnca/domain';
import {
  THIRD_SCHEDULE_SECTION_21_CLAUSES,
  THIRD_SCHEDULE_SECTION_22_TOPICS,
  type ThirdScheduleClause,
} from '@dnca/ontology';

/**
 * OM Cross-Reference Matrix — operator's attestation that every binding
 * Third Schedule clause is addressed somewhere in their OM. The artefact
 * KCAA expects with a Reg 17(3) submission.
 *
 * Each row is one Third Schedule clause + either the operator's mapping
 * (OM section + evidence) OR a "not yet mapped" placeholder. Each row also
 * carries the clause's `pendingPrimarySource` flag from @dnca/ontology so
 * the page can distinguish "we don't know the clause subject yet" from
 * "we know the subject but the operator hasn't mapped it".
 */

export interface OmCrossReferenceMatrixInput {
  operator: Operator;
  mappings: ReadonlyArray<OmCrossReferenceMapping>;
  asOf: IsoDate;
  generatedAt: Date;
  generatedByUserName?: string;
}

export interface OmMatrixRow {
  clause: ThirdScheduleClause;
  mapping: OmCrossReferenceMapping | null;
}

export interface OmMatrixSectionTotals {
  total: number;
  subjectVerified: number;
  subjectPending: number;
  mapped: number;
  unmapped: number;
}

export interface OmCrossReferenceMatrixData {
  operator: Operator;
  asOf: IsoDate;
  generatedAt: Date;
  generatedByUserName: string | null;
  documentTitle: string;
  section21: ReadonlyArray<OmMatrixRow>;
  section22: ReadonlyArray<OmMatrixRow>;
  totals: {
    section21: OmMatrixSectionTotals;
    section22: OmMatrixSectionTotals;
  };
}

function totalsFor(rows: ReadonlyArray<OmMatrixRow>): OmMatrixSectionTotals {
  let subjectVerified = 0;
  let mapped = 0;
  for (const row of rows) {
    if (!row.clause.pendingPrimarySource) subjectVerified += 1;
    if (row.mapping !== null) mapped += 1;
  }
  return {
    total: rows.length,
    subjectVerified,
    subjectPending: rows.length - subjectVerified,
    mapped,
    unmapped: rows.length - mapped,
  };
}

export function buildOmCrossReferenceMatrix(
  input: OmCrossReferenceMatrixInput,
): OmCrossReferenceMatrixData {
  const mappingsByRef = new Map<string, OmCrossReferenceMapping>();
  for (const m of input.mappings) {
    if (m.operatorId !== input.operator.id) continue;
    mappingsByRef.set(m.clauseShortRef, m);
  }

  const buildRows = (clauses: ReadonlyArray<ThirdScheduleClause>): ReadonlyArray<OmMatrixRow> =>
    clauses.map((clause) => ({
      clause,
      mapping: mappingsByRef.get(clause.shortRef) ?? null,
    }));

  const section21 = buildRows(THIRD_SCHEDULE_SECTION_21_CLAUSES);
  const section22 = buildRows(THIRD_SCHEDULE_SECTION_22_TOPICS);

  return {
    operator: input.operator,
    asOf: input.asOf,
    generatedAt: input.generatedAt,
    generatedByUserName: input.generatedByUserName ?? null,
    documentTitle: `OM Cross-Reference Matrix — ${input.operator.tradingName}`,
    section21,
    section22,
    totals: {
      section21: totalsFor(section21),
      section22: totalsFor(section22),
    },
  };
}

export function omCrossReferenceFilenameStem(operator: Operator, asOf: IsoDate): string {
  const safe = operator.shortCode.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `om-cross-reference-matrix_${safe}_${asOf}`;
}

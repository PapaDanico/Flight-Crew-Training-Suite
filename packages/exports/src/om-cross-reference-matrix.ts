import type { IsoDate, OmCrossReferenceMapping, Operator } from '@dnca/domain';
import { THIRD_SCHEDULE_SECTIONS, type ThirdScheduleClause } from '@dnca/ontology';

/**
 * OM Cross-Reference Matrix — operator's attestation that every binding
 * Third Schedule clause is addressed somewhere in their OM. The artefact
 * KCAA expects with a Reg 17(3) submission.
 *
 * Each row is one Third Schedule clause + either the operator's mapping
 * (OM section + evidence) OR a "not yet mapped" placeholder. The Schedule has
 * four sub-sections (§2.1 General, §2.2 Aircraft operating information,
 * §2.3 Routes/aerodromes, §2.4 Training); the matrix iterates them all.
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

export interface OmMatrixSection {
  ref: string;
  title: string;
  rows: ReadonlyArray<OmMatrixRow>;
  totals: OmMatrixSectionTotals;
}

export interface OmCrossReferenceMatrixData {
  operator: Operator;
  asOf: IsoDate;
  generatedAt: Date;
  generatedByUserName: string | null;
  documentTitle: string;
  sections: ReadonlyArray<OmMatrixSection>;
  overall: OmMatrixSectionTotals;
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

function sumTotals(parts: ReadonlyArray<OmMatrixSectionTotals>): OmMatrixSectionTotals {
  return parts.reduce<OmMatrixSectionTotals>(
    (acc, t) => ({
      total: acc.total + t.total,
      subjectVerified: acc.subjectVerified + t.subjectVerified,
      subjectPending: acc.subjectPending + t.subjectPending,
      mapped: acc.mapped + t.mapped,
      unmapped: acc.unmapped + t.unmapped,
    }),
    { total: 0, subjectVerified: 0, subjectPending: 0, mapped: 0, unmapped: 0 },
  );
}

export function buildOmCrossReferenceMatrix(
  input: OmCrossReferenceMatrixInput,
): OmCrossReferenceMatrixData {
  const mappingsByRef = new Map<string, OmCrossReferenceMapping>();
  for (const m of input.mappings) {
    if (m.operatorId !== input.operator.id) continue;
    mappingsByRef.set(m.clauseShortRef, m);
  }

  const sections: OmMatrixSection[] = THIRD_SCHEDULE_SECTIONS.map((s) => {
    const rows: OmMatrixRow[] = s.clauses.map((clause) => ({
      clause,
      mapping: mappingsByRef.get(clause.shortRef) ?? null,
    }));
    return { ref: s.ref, title: s.title, rows, totals: totalsFor(rows) };
  });

  return {
    operator: input.operator,
    asOf: input.asOf,
    generatedAt: input.generatedAt,
    generatedByUserName: input.generatedByUserName ?? null,
    documentTitle: `OM Cross-Reference Matrix — ${input.operator.tradingName}`,
    sections,
    overall: sumTotals(sections.map((s) => s.totals)),
  };
}

export function omCrossReferenceFilenameStem(operator: Operator, asOf: IsoDate): string {
  const safe = operator.shortCode.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `om-cross-reference-matrix_${safe}_${asOf}`;
}

import {
  type CurrencyRecord,
  type CurrencyStatus,
  type IsoDate,
  type OmCrossReferenceMapping,
  type Operator,
  type Pilot,
} from '@dnca/domain';
import type { RegulatoryInstrument } from '@dnca/ontology';
import { buildCrewCurrencySnapshot } from './crew-currency-snapshot.js';
import { buildOmCrossReferenceMatrix } from './om-cross-reference-matrix.js';

/**
 * Compliance Evidence Pack — the index/cover artefact a Head of Training hands
 * a KCAA inspector (CLAUDE.md §"Exports"). It does not re-derive anything: it
 * composes the existing builders (currency snapshot, OM cross-reference matrix)
 * so its headline numbers are identical to the standalone exports, summarises
 * regulatory provenance, and lists every constituent artefact with a deep link.
 */

export interface ComplianceEvidencePackInput {
  operator: Operator;
  pilots: ReadonlyArray<Pilot>;
  currencyRecords: ReadonlyArray<CurrencyRecord>;
  omMappings: ReadonlyArray<OmCrossReferenceMapping>;
  instruments: ReadonlyArray<RegulatoryInstrument>;
  asOf: IsoDate;
  generatedAt: Date;
  generatedByUserName?: string;
}

export type EvidenceArtifactKind =
  | 'crew-currency-snapshot'
  | 'om-cross-reference-matrix'
  | 'pilot-training-file'
  | 'kcaa-transmittal';

export interface EvidencePackArtifact {
  kind: EvidenceArtifactKind;
  title: string;
  description: string;
  href: string;
}

export interface EvidenceProvenanceRow {
  shortLabel: string;
  longLabel: string;
  effectiveDate: string | null;
  verified: boolean;
  authoritativeUrl: string | null;
}

export interface EvidencePilotFile {
  pilotId: string;
  name: string;
  href: string;
}

export interface EvidenceStatement {
  heading: string;
  text: string;
}

export interface ComplianceEvidencePack {
  operator: Operator;
  asOf: IsoDate;
  generatedAt: Date;
  generatedByUserName: string | null;
  documentTitle: string;
  currencyPosture: {
    pilotCount: number;
    totals: Record<CurrencyStatus, number>;
  };
  omCoverage: {
    totalClauses: number;
    mapped: number;
    unmapped: number;
  };
  provenance: {
    verifiedCount: number;
    totalCount: number;
    rows: ReadonlyArray<EvidenceProvenanceRow>;
  };
  artifacts: ReadonlyArray<EvidencePackArtifact>;
  pilotFiles: ReadonlyArray<EvidencePilotFile>;
  statements: ReadonlyArray<EvidenceStatement>;
}

function statements(): EvidenceStatement[] {
  return [
    {
      heading: 'Records retention',
      text: 'Training records are retained for a minimum of five years per KCARs; certain items for the lifetime of the licence. Flight recorder data following an event is retained for 60 days.',
    },
    {
      heading: 'Audit integrity',
      text: 'Every state change is written to an append-only audit log; UPDATE and DELETE are rejected at the database. An inspector can reconstruct the full history of any record.',
    },
    {
      heading: 'Data protection',
      text: 'DNCA is the data controller under the Kenya Data Protection Act 2019; operator data is held in-region and breaches are notifiable within 72 hours.',
    },
    {
      heading: 'Source of truth',
      text: 'Every currency status and regulatory citation in this pack is computed by @dnca/domain and @dnca/ontology — the same logic and constants that protect the platform write path, so the pack cannot drift from the live system.',
    },
  ];
}

export function buildComplianceEvidencePack(
  input: ComplianceEvidencePackInput,
): ComplianceEvidencePack {
  const opId = input.operator.id;
  const pilots = input.pilots.filter((p) => p.operatorId === opId);
  const records = input.currencyRecords.filter((r) => r.operatorId === opId);

  const snapshot = buildCrewCurrencySnapshot({
    operator: input.operator,
    pilots,
    currencyRecords: records,
    asOf: input.asOf,
    generatedAt: input.generatedAt,
  });
  const matrix = buildOmCrossReferenceMatrix({
    operator: input.operator,
    mappings: input.omMappings,
    asOf: input.asOf,
    generatedAt: input.generatedAt,
  });

  const provenanceRows: EvidenceProvenanceRow[] = input.instruments.map((i) => ({
    shortLabel: i.shortLabel,
    longLabel: i.longLabel,
    effectiveDate: i.effectiveDate ?? null,
    verified: i.primarySourceVerified === true,
    authoritativeUrl: i.authoritativeUrl ?? null,
  }));

  const pilotFiles: EvidencePilotFile[] = pilots.map((p) => ({
    pilotId: p.id,
    name: p.fullName,
    href: `/exports/pilot-training-file?pilotId=${p.id}`,
  }));

  const artifacts: EvidencePackArtifact[] = [
    {
      kind: 'crew-currency-snapshot',
      title: 'Crew Currency Snapshot',
      description: 'Operator-wide, point-in-time currency status for every pilot and item.',
      href: `/exports/crew-currency-snapshot?operatorId=${opId}`,
    },
    {
      kind: 'om-cross-reference-matrix',
      title: 'OM Cross-Reference Matrix',
      description: 'LN 42/2026 Third Schedule clause → OM section → evidence.',
      href: `/exports/om-cross-reference-matrix?operatorId=${opId}`,
    },
    {
      kind: 'kcaa-transmittal',
      title: 'KCAA Transmittal Letter (Reg 17(3))',
      description:
        'Submission cover letter with the 30-day deadline and Letter of Effective Pages.',
      href: `/exports/kcaa-transmittal?operatorId=${opId}`,
    },
    {
      kind: 'pilot-training-file',
      title: 'Pilot Training Files',
      description: `Per-pilot complete history (${pilotFiles.length} pilot${
        pilotFiles.length === 1 ? '' : 's'
      }).`,
      href: pilotFiles[0]?.href ?? '/exports/pilot-training-file',
    },
  ];

  return {
    operator: input.operator,
    asOf: input.asOf,
    generatedAt: input.generatedAt,
    generatedByUserName: input.generatedByUserName ?? null,
    documentTitle: `Compliance Evidence Pack — ${input.operator.tradingName}`,
    currencyPosture: {
      pilotCount: snapshot.pilots.length,
      totals: snapshot.operatorTotals,
    },
    omCoverage: {
      totalClauses: matrix.overall.total,
      mapped: matrix.overall.mapped,
      unmapped: matrix.overall.unmapped,
    },
    provenance: {
      verifiedCount: provenanceRows.filter((r) => r.verified).length,
      totalCount: provenanceRows.length,
      rows: provenanceRows,
    },
    artifacts,
    pilotFiles,
    statements: statements(),
  };
}

export function complianceEvidencePackFilenameStem(operator: Operator, asOf: IsoDate): string {
  const safe = operator.shortCode.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `compliance-evidence-pack_${safe}_${asOf}`;
}

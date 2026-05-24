import type { Citation, RegulatoryInstrument } from './citation.js';

/**
 * KCARs 2025 — Kenya Civil Aviation Regulations, gazetted as Legal Notices
 * 29, 30, 31, 37, 40, 41, 42 of 2026. The 2018 regulations are repealed.
 *
 * Effective dates per CLAUDE.md / README.
 */
export const LN_29_2026: RegulatoryInstrument = {
  framework: 'KCARs',
  instrumentId: 'LN-29-2026',
  shortLabel: 'LN 29/2026',
  longLabel: 'Legal Notice 29 of 2026 — Operations (Aeroplanes)',
  effectiveDate: '2026-03-03',
};

export const LN_30_2026: RegulatoryInstrument = {
  framework: 'KCARs',
  instrumentId: 'LN-30-2026',
  shortLabel: 'LN 30/2026',
  longLabel: 'Legal Notice 30 of 2026 — Safety Management & ATS',
  effectiveDate: '2026-03-03',
};

export const LN_31_2026: RegulatoryInstrument = {
  framework: 'KCARs',
  instrumentId: 'LN-31-2026',
  shortLabel: 'LN 31/2026',
  longLabel: 'Legal Notice 31 of 2026 — Aviation Security & Personnel Licensing',
  effectiveDate: '2026-03-03',
};

export const LN_37_2026: RegulatoryInstrument = {
  framework: 'KCARs',
  instrumentId: 'LN-37-2026',
  shortLabel: 'LN 37/2026',
  longLabel: 'Legal Notice 37 of 2026 — Airworthiness',
  effectiveDate: '2026-03-03',
};

export const LN_40_2026: RegulatoryInstrument = {
  framework: 'KCARs',
  instrumentId: 'LN-40-2026',
  shortLabel: 'LN 40/2026',
  longLabel: 'Legal Notice 40 of 2026 — Unmanned Aircraft Systems',
  effectiveDate: '2026-03-03',
};

export const LN_41_2026: RegulatoryInstrument = {
  framework: 'KCARs',
  instrumentId: 'LN-41-2026',
  shortLabel: 'LN 41/2026',
  longLabel: 'Legal Notice 41 of 2026 — Aerodromes',
  effectiveDate: '2026-03-03',
};

/**
 * LN 42/2026 — Air Operator Certification & Administration. Its Third Schedule
 * is the binding Operations Manual content list: §2.1 (34 OM clauses) and
 * §2.2 (12 mandatory training topics). Population of clause subjects awaits
 * the primary-source PDF — see THIRD_SCHEDULE below.
 */
export const LN_42_2026: RegulatoryInstrument = {
  framework: 'KCARs',
  instrumentId: 'LN-42-2026',
  shortLabel: 'LN 42/2026',
  longLabel: 'Legal Notice 42 of 2026 — Air Operator Certification & Administration',
  effectiveDate: '2026-03-06',
  notes: 'Third Schedule is the binding OM content list.',
};

export const KCARS_2025_INSTRUMENTS: ReadonlyArray<RegulatoryInstrument> = [
  LN_29_2026,
  LN_30_2026,
  LN_31_2026,
  LN_37_2026,
  LN_40_2026,
  LN_41_2026,
  LN_42_2026,
];

/**
 * Key binding regulations, citable individually. Sections use KCARs native
 * notation (e.g. '17(3)' for sub-paragraph (3) of regulation 17).
 */
export const REG_17_3: Citation = {
  instrument: LN_42_2026,
  section: '17(3)',
  subject: 'Manuals submitted to KCAA at least 30 days before intended implementation',
};

export const REG_32_3: Citation = {
  instrument: LN_29_2026,
  section: '32(3)',
  subject: 'Human Factors statutory in checklist design',
};

export const REG_38_3: Citation = {
  instrument: LN_29_2026,
  section: '38(3)',
  subject: 'Human Factors statutory in checklist design (companion to 32(3))',
};

export const REG_56_2: Citation = {
  instrument: LN_29_2026,
  section: '56(2)',
  subject: 'FDAP mandatory for aircraft > 27,000 kg MTOW',
};

export const REG_18_3_I: Citation = {
  instrument: LN_29_2026,
  section: '18(3)(i)',
  subject: 'FDR post-event retention 60 days',
};

export const REG_84: Citation = {
  instrument: LN_42_2026,
  section: '84',
  subject: '12-month transition window from effective date',
};

/**
 * Reg 84 transition deadline — calculated as effective + 12 months. Cabinet
 * Secretary may extend; if extended, the extension instrument's id and date
 * supersede this constant.
 */
export const REG_84_UNEXTENDED_DEADLINE = '2027-03-06' as const;

/**
 * Sixth Schedule penalty bands.
 */
export const SIXTH_SCHEDULE_PENALTIES = {
  aClass: { maxFineKsh: 1_000_000, maxImprisonmentYears: 1 },
  bClass: { maxFineKsh: 2_000_000, maxImprisonmentYears: 3 },
  notes:
    'Operational consequence beyond fines: AOC suspension/revocation exposure, individual licence action.',
} as const;

// ----------------------------------------------------------------------------
// LN 42/2026 Third Schedule structure
//
// The Third Schedule contains:
//   §2.1 — 34 OM content clauses (binding contents list for the operator's
//          Operations Manual).
//   §2.2 — 12 mandatory training topics.
//
// Clause subjects are populated as primary-source material becomes available
// (PDF in /docs/regulatory/). Only entries verified against either CLAUDE.md
// or the original prototype's cross-reference tab appear below.
// ----------------------------------------------------------------------------

export interface ThirdScheduleClause {
  readonly number: number;
  readonly shortRef: string;
  /** Null when the subject hasn't been verified against the primary-source PDF. */
  readonly subject: string | null;
  readonly pendingPrimarySource: boolean;
  readonly notes?: string;
}

function buildSectionClauses(
  prefix: '§2.1' | '§2.2',
  count: number,
  known: ReadonlyArray<{ number: number; subject: string; notes?: string }>,
): ReadonlyArray<ThirdScheduleClause> {
  const byNumber = new Map(known.map((k) => [k.number, k]));
  return Array.from({ length: count }, (_unused, i) => {
    const number = i + 1;
    const k = byNumber.get(number);
    if (k) {
      return {
        number,
        shortRef: `${prefix}.${number}`,
        subject: k.subject,
        pendingPrimarySource: false,
        ...(k.notes !== undefined ? { notes: k.notes } : {}),
      };
    }
    return {
      number,
      shortRef: `${prefix}.${number}`,
      subject: null,
      pendingPrimarySource: true,
    };
  });
}

export const THIRD_SCHEDULE_SECTION_21_CLAUSES: ReadonlyArray<ThirdScheduleClause> =
  buildSectionClauses('§2.1', 34, [
    {
      number: 25,
      subject: 'Stabilised approach criteria',
      notes: 'Operators submit their own gate heights; the regulation does not prescribe values.',
    },
  ]);

export const THIRD_SCHEDULE_SECTION_22_TOPICS: ReadonlyArray<ThirdScheduleClause> =
  buildSectionClauses('§2.2', 12, [{ number: 4, subject: 'Crew Resource Management (CRM)' }]);

export const THIRD_SCHEDULE = {
  instrument: LN_42_2026,
  section21: {
    title: 'OM content list',
    clauseCount: 34,
    clauses: THIRD_SCHEDULE_SECTION_21_CLAUSES,
    knownClauses: THIRD_SCHEDULE_SECTION_21_CLAUSES.filter((c) => !c.pendingPrimarySource),
  },
  section22: {
    title: 'Mandatory training topics',
    topicCount: 12,
    clauses: THIRD_SCHEDULE_SECTION_22_TOPICS,
    knownTopics: THIRD_SCHEDULE_SECTION_22_TOPICS.filter((c) => !c.pendingPrimarySource),
  },
} as const;

/**
 * KCAA Advisory Circulars remain at 2018 vintage as subordinate guidance only.
 * Where an AC conflicts with KCARs 2025, the regulation prevails (CLAUDE.md
 * §"Regulatory framework").
 */
export const KCAA_AC_LEGACY: ReadonlyArray<RegulatoryInstrument> = [
  {
    framework: 'KCAA-AC',
    instrumentId: 'CAA-AC-OPS022A',
    shortLabel: 'CAA-AC-OPS022A',
    longLabel: 'KCAA Advisory Circular CAA-AC-OPS022A (2018)',
    notes: 'Subordinate to KCARs 2025; superseded where in conflict.',
  },
  {
    framework: 'KCAA-AC',
    instrumentId: 'CAA-M-OPS022',
    shortLabel: 'CAA-M-OPS022',
    longLabel: 'KCAA Manual CAA-M-OPS022 (2018)',
    notes: 'Subordinate to KCARs 2025; superseded where in conflict.',
  },
];

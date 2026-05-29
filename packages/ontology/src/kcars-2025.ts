import type { Citation, RegulatoryInstrument } from './citation.js';

/**
 * KCARs 2025 — Kenya Civil Aviation Regulations, gazetted as Legal Notices of
 * 2026. The 2018 regulations are repealed.
 *
 * Verification state (`primarySourceVerified`) records whether the instrument's
 * subject/number/date was checked against the authoritative primary source.
 * All seven binding-law notices (29/30/31/37/40/41/42) are now confirmed:
 * LN 40 and LN 42 against the gazette PDFs on file, and all seven against the
 * official Kenya Law record (`authoritativeUrl`, the Akoma-Ntoso URN). The
 * effective dates fall in three gazette batches: 3 Mar 2026 (LN 29/30/31),
 * 6 Mar 2026 (LN 37/40/41/42) and 25 Mar 2026 (the later operational set).
 * See kcars-2025-alignment.md §1.6.
 */
export const LN_29_2026: RegulatoryInstrument = {
  framework: 'KCARs',
  instrumentId: 'LN-29-2026',
  shortLabel: 'LN 29/2026',
  longLabel:
    'Legal Notice 29 of 2026 — Operation of Aircraft for Commercial Air Transport (Aeroplanes)',
  effectiveDate: '2026-03-03',
  authoritativeUrl: 'https://new.kenyalaw.org/akn/ke/act/ln/2026/29/eng@2026-03-03',
  primarySourceVerified: true,
  notes:
    'The CAT-aeroplane operations regulation (distinct from LN 47, General Aviation — Aeroplanes). Home of the operational regs the platform cites: FDAP (>27,000 kg), FDR retention, and Human-Factors-in-checklists. FDAP/>27,000 kg is also restated verbatim in LN 42. Reg sub-numbers (56(2), 18(3)(i), 32(3)/38(3)) per CLAUDE.md; Kenya Law full-text not machine-fetchable to re-confirm the sub-numbers.',
};

export const LN_30_2026: RegulatoryInstrument = {
  framework: 'KCARs',
  instrumentId: 'LN-30-2026',
  shortLabel: 'LN 30/2026',
  longLabel: 'Legal Notice 30 of 2026 — Air Traffic Services',
  effectiveDate: '2026-03-03',
  authoritativeUrl: 'https://new.kenyalaw.org/akn/ke/act/ln/2026/30/eng@2026-03-03',
  primarySourceVerified: true,
  notes: 'Safety Management is a separate instrument (LN 32/2026).',
};

export const LN_31_2026: RegulatoryInstrument = {
  framework: 'KCARs',
  instrumentId: 'LN-31-2026',
  shortLabel: 'LN 31/2026',
  longLabel: 'Legal Notice 31 of 2026 — Security',
  effectiveDate: '2026-03-03',
  authoritativeUrl: 'https://new.kenyalaw.org/akn/ke/act/ln/2026/31/eng@2026-03-03',
  primarySourceVerified: true,
  notes:
    'Official short title is "(Security) Regulations" (aviation security / AVSEC). Personnel Licensing is a separate instrument (LN 50/2026).',
};

export const LN_37_2026: RegulatoryInstrument = {
  framework: 'KCARs',
  instrumentId: 'LN-37-2026',
  shortLabel: 'LN 37/2026',
  longLabel: 'Legal Notice 37 of 2026 — Airworthiness',
  effectiveDate: '2026-03-06',
  authoritativeUrl: 'https://new.kenyalaw.org/akn/ke/act/ln/2026/37/eng@2026-03-06',
  primarySourceVerified: true,
};

export const LN_40_2026: RegulatoryInstrument = {
  framework: 'KCARs',
  instrumentId: 'LN-40-2026',
  shortLabel: 'LN 40/2026',
  longLabel: 'Legal Notice 40 of 2026 — Unmanned Aircraft Systems',
  effectiveDate: '2026-03-06',
  authoritativeUrl: 'https://new.kenyalaw.org/akn/ke/act/ln/2026/40/eng@2026-03-06',
  primarySourceVerified: true,
};

export const LN_41_2026: RegulatoryInstrument = {
  framework: 'KCARs',
  instrumentId: 'LN-41-2026',
  shortLabel: 'LN 41/2026',
  longLabel: 'Legal Notice 41 of 2026 — Certification, Licensing and Registration of Aerodromes',
  effectiveDate: '2026-03-06',
  authoritativeUrl: 'https://new.kenyalaw.org/akn/ke/act/ln/2026/41/eng@2026-03-06',
  primarySourceVerified: true,
};

/**
 * LN 42/2026 — Air Operator Certification & Administration (Kenya Gazette
 * Supplement No. 52, 6 March 2026; Legislative Supplement No. 37). Its Third
 * Schedule (rr. 30(1) and 31(2)) is the binding Operations Manual content
 * list. Verified against the gazetted PDF, its structure is:
 *   §2.1 General — 39 clauses (2.1.1–2.1.39)
 *   §2.2 Aircraft operating information — 13 clauses (2.2.1–2.2.13)
 *   §2.3 Routes, aerodromes and heliports — 6 clauses (2.3.1–2.3.6)
 *   §2.4 Training — 3 clauses (2.4.1–2.4.3)
 * See THIRD_SCHEDULE below. (The earlier "§2.1 = 34 clauses / §2.2 = 12
 * training topics" summary was inaccurate and has been corrected to the
 * gazetted text.)
 */
export const LN_42_2026: RegulatoryInstrument = {
  framework: 'KCARs',
  instrumentId: 'LN-42-2026',
  shortLabel: 'LN 42/2026',
  longLabel: 'Legal Notice 42 of 2026 — Air Operator Certification & Administration',
  effectiveDate: '2026-03-06',
  authoritativeUrl: 'https://new.kenyalaw.org/akn/ke/act/ln/2026/42/eng@2026-03-06',
  primarySourceVerified: true,
  notes:
    'Read in full from the gazette PDF. Third Schedule is the binding OM content list; Sixth Schedule (r. 82) carries the penalties; reg 17(3) is the 30-day submission rule.',
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

/**
 * The FDAP / >27,000 kg requirement is also stated verbatim in LN 42 (read from
 * the gazette: an operator of an aeroplane with MTOM in excess of 27 000 kg
 * "shall establish and maintain a flight data analysis programme as part of its
 * safety management system"), under the "Safety Programme and Management System"
 * regulation, sub-paragraph (2). LN 29 (CAT — Aeroplanes) is the operational
 * home of the requirement; LN 42 restates it for AOC holders. Confirm the exact
 * LN 42 regulation number against the gazette before citing it in an export.
 */
export const REG_FDAP_LN42: Citation = {
  instrument: LN_42_2026,
  subject:
    'FDAP required as part of the SMS for aeroplanes with MTOM > 27,000 kg (Safety Programme and Management System reg, sub-para (2))',
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
 * Sixth Schedule penalty bands — verified verbatim against the LN 42 gazette
 * (r. 82): a contravention of an "A" provision is liable to a fine not
 * exceeding one million shillings per offence and/or imprisonment not exceeding
 * one year; a "B" provision, a fine not exceeding two million shillings per
 * offence and/or imprisonment not exceeding three years.
 */
export const SIXTH_SCHEDULE_PENALTIES = {
  reg: '82',
  primarySourceVerified: true,
  aClass: { maxFineKsh: 1_000_000, maxImprisonmentYears: 1 },
  bClass: { maxFineKsh: 2_000_000, maxImprisonmentYears: 3 },
  notes:
    'Verified against LN 42 r. 82 / Sixth Schedule. Operational consequence beyond fines: AOC suspension/revocation exposure, individual licence action.',
} as const;

// ----------------------------------------------------------------------------
// LN 42/2026 Third Schedule — Operations Manual (rr. 30(1) and 31(2))
//
// Transcribed from the gazetted notice (Kenya Gazette Supplement No. 52,
// 6 March 2026). The Schedule's CONTENTS (clause 2) has four sub-sections:
//   §2.1 General (39) · §2.2 Aircraft operating information (13) ·
//   §2.3 Routes, aerodromes and heliports (6) · §2.4 Training (3).
// Subjects below are condensed from the clause text; the clause numbering and
// section structure match the gazette exactly.
// ----------------------------------------------------------------------------

export interface ThirdScheduleClause {
  readonly number: number;
  readonly shortRef: string;
  /** Null only if a clause subject is genuinely unverified. */
  readonly subject: string | null;
  readonly pendingPrimarySource: boolean;
  readonly notes?: string;
}

export interface ThirdScheduleSection {
  /** e.g. '§2.1'. */
  readonly ref: string;
  readonly title: string;
  readonly clauses: ReadonlyArray<ThirdScheduleClause>;
}

function section(
  ref: string,
  title: string,
  subjects: ReadonlyArray<string>,
  notesByNumber: Readonly<Record<number, string>> = {},
): ThirdScheduleSection {
  return {
    ref,
    title,
    clauses: subjects.map((subject, i) => {
      const number = i + 1;
      const note = notesByNumber[number];
      return {
        number,
        shortRef: `${ref}.${number}`,
        subject,
        pendingPrimarySource: false,
        ...(note !== undefined ? { notes: note } : {}),
      };
    }),
  };
}

const SECTION_21 = section(
  '§2.1',
  'General',
  [
    'Responsibilities of each crew member and persons assigned operational control',
    'Flight and duty time limitations and rest schemes for flight and cabin crew members',
    'List of navigational equipment to be carried, including performance-based navigation requirements',
    'Long-range navigation procedures, EDTO engine-failure procedure, and diversion-aerodrome nomination/use',
    'Circumstances in which a radio listening watch is to be maintained',
    'Method for determining minimum flight altitudes',
    'Methods for determining aerodrome operating minima',
    'Safety precautions during refuelling with passengers on board',
    'Ground handling arrangements and procedures',
    'Procedures for pilots-in-command when an accident is observed',
    'Flight crew for each type of operation, including the succession of command',
    'Computation of fuel and oil quantities (incl. loss of pressurisation and en-route engine failure)',
    'Conditions for oxygen use and the amount of oxygen (per the Fourth Schedule of the ANO)',
    'Instructions for mass and balance control',
    'Conduct and control of ground de-icing/anti-icing operations',
    'Specifications for the operational flight plan',
    'Standard operating procedures (SOP) for each phase of flight',
    'Use of normal checklists and the timing of their use',
    'Departure contingency procedures',
    'Maintenance of altitude awareness and use of automated/flight-crew altitude call-out',
    'Use of autopilots and auto-throttles in IMC',
    'Clarification and acceptance of ATC clearances, particularly where terrain clearance is involved',
    'Departure and approach briefings',
    'Procedures for familiarisation with areas, routes and aerodromes',
    'Stabilised approach procedure',
    'Limitation on high rates of descent near the surface',
    'Conditions required to commence or to continue an instrument approach',
    'Conduct of precision and non-precision instrument approach procedures',
    'Allocation of flight-crew duties and crew-workload management during night/IMC approach and landing',
    'Training/awareness for avoidance of CFIT and use of GPWS; and upset prevention and recovery',
    'Avoidance of collisions and use of the airborne collision avoidance system (ACAS)',
    'Interception of civil aircraft (PIC procedures; visual signals)',
    'Operations above 49,000 ft (15,000 m): solar cosmic-radiation guidance, descent procedures, dose records',
    'Safety management system and related flight-safety programmes relevant to flight operations',
    'Carriage of dangerous goods, including emergency action, labelling/marking, loading and crew responsibilities',
    'Security instructions and guidance',
    'Bomb-search checklist and inspection for concealed weapons/explosives; least-risk bomb location',
    'Use of automatic landing systems, HUD or equivalent displays, and EVS/SVS/CVS equipment',
    'Use of the electronic flight bag (EFB)',
  ],
  {
    25: 'Operators submit their own gate heights; the regulation does not prescribe values.',
    2: 'FTL/rest scheme is an OM-content requirement here; numeric limits derive from the operator’s approved scheme.',
  },
);

const SECTION_22 = section('§2.2', 'Aircraft operating information', [
  'Certification limitations and operating limitations',
  'Normal, abnormal and emergency procedures and checklists used by the flight crew',
  'Operating instructions and information on climb performance',
  'Flight planning data for pre-flight and in-flight planning (different thrust/power and speed settings)',
  'Maximum crosswind and tailwind components per type, with reductions for gusts/visibility/runway/crew/autopilot etc.',
  'Instructions for aircraft loading and securing of load',
  'Aircraft systems, associated controls and instructions for their use',
  'Minimum equipment list (MEL) and configuration deviation list (CDL), incl. PBN requirements',
  'Checklist of emergency and safety equipment and instructions for their use',
  'Emergency evacuation procedures (type-specific; crew coordination; emergency positions/duties)',
  'Normal/abnormal/emergency procedures for cabin crew and flight-/cabin-crew coordination',
  'Survival and emergency equipment for different routes and pre-take-off verification (incl. oxygen)',
  'Ground-air visual signal code for use by survivors',
]);

const SECTION_23 = section('§2.3', 'Routes, aerodromes and heliports', [
  'Route guide (communications, navigation aids, aerodromes, approaches/arrivals/departures) per flight',
  'Minimum flight altitudes for each route to be flown',
  'Aerodrome operating minima for aerodromes of intended landing and alternates',
  'Increase of aerodrome operating minima on degradation of approach/aerodrome facilities',
  'Instructions for determining aerodrome operating minima',
  'Information for flight-profile compliance (take-off/en-route/approach/landing climb & runway length; dry/wet/contaminated; tyre-speed)',
]);

const SECTION_24 = section('§2.4', 'Training', [
  'Details of the flight crew training programme',
  'Details of the cabin crew duties training programme',
  'Details of the flight operations officer/flight dispatcher training programme (where employed)',
]);

export const THIRD_SCHEDULE_SECTIONS: ReadonlyArray<ThirdScheduleSection> = [
  SECTION_21,
  SECTION_22,
  SECTION_23,
  SECTION_24,
];

/** Back-compatible alias: §2.1 (General) clauses. */
export const THIRD_SCHEDULE_SECTION_21_CLAUSES = SECTION_21.clauses;

export const THIRD_SCHEDULE = {
  instrument: LN_42_2026,
  reference: 'rr. 30(1) and 31(2)',
  title: 'Operations Manual',
  sections: THIRD_SCHEDULE_SECTIONS,
  totalClauseCount: THIRD_SCHEDULE_SECTIONS.reduce((n, s) => n + s.clauses.length, 0),
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

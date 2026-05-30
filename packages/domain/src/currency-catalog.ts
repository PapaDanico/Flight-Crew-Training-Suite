import type { CurrencyCategory, CurrencyKind } from './currency.js';

/**
 * Cycle expressed as one of: month-count (Class 1 Medical, OPC, …),
 * rolling-days (PIC recency), or 'per-event' for items keyed off a specific
 * document or condition (passport expiry, route qualification).
 */
export type CurrencyCycle =
  | { kind: 'months'; months: number }
  | { kind: 'days-rolling'; days: number; requirement: string }
  | { kind: 'per-event'; description: string };

export interface CurrencyCatalogEntry {
  kind: CurrencyKind;
  label: string;
  category: CurrencyCategory;
  cycle: CurrencyCycle;
  primarySource: string;
  notes?: string;
}

/**
 * The 23-item catalog covering all currencies tracked by the platform. Reflects
 * CLAUDE.md §"Core data model" plus the Phase-0 audit additions
 * (Aerodrome / Route / PIC Recency / Cat II / Cat III / Crew Pairing /
 *  ELP / Passport-Visa) and the Windshear/UPRT split.
 *
 * Cycle values are operator-configurable defaults — see OperatorConfig.
 */
export const CURRENCY_CATALOG: ReadonlyArray<CurrencyCatalogEntry> = [
  {
    kind: 'class1Medical',
    label: 'Class 1 Medical',
    category: 'Personal',
    cycle: { kind: 'months', months: 12 },
    primarySource: 'ICAO Annex 1 / KCARs LN 50/2026 (Personnel Licensing)',
    notes:
      'Validity is age-dependent: 12 months under 40; 6 months at 40+ (and 6 months at 60+ in ' +
      'multi-crew CAT). The 12-month cycle here is the under-40 baseline — use ' +
      'class1MedicalValidityMonths(age) to derive the correct window.',
  },
  {
    kind: 'atplCpl',
    label: 'ATPL / CPL',
    category: 'Personal',
    cycle: { kind: 'months', months: 60 },
    primarySource: 'ICAO Annex 1 §2.5 / KCARs PEL',
  },
  {
    kind: 'elpLevel',
    label: 'English Language Proficiency (ELP)',
    category: 'Personal',
    cycle: {
      kind: 'per-event',
      description: 'Level 4 = 3 yr · Level 5 = 6 yr · Level 6 = lifetime',
    },
    primarySource: 'ICAO Annex 1 §1.2.9 / KCARs LN 50/2026 reg 8 + Second Schedule',
  },
  {
    kind: 'passportVisa',
    label: 'Passport / Visa',
    category: 'Personal',
    cycle: { kind: 'per-event', description: 'Per document expiry' },
    primarySource: 'Operator OM-A crew documents',
  },

  {
    kind: 'typeRating',
    label: 'F70/100 Type Rating',
    category: 'Type',
    cycle: { kind: 'months', months: 12 },
    primarySource: 'ICAO Annex 1 §2.6 / EASA Part-FCL.740',
  },
  {
    kind: 'opc',
    label: 'OPC (Operator Proficiency Check)',
    category: 'Type',
    cycle: { kind: 'months', months: 6 },
    primarySource: 'EASA ORO.FC.230 / KCARs LN 42/2026 §2.2',
  },
  {
    kind: 'lpc',
    label: 'LPC (Licence Proficiency Check)',
    category: 'Type',
    cycle: { kind: 'months', months: 12 },
    primarySource: 'EASA Part-FCL.625 / ICAO Annex 1',
  },

  {
    kind: 'lineCheck',
    label: 'Line Check',
    category: 'Operational',
    cycle: { kind: 'months', months: 12 },
    primarySource: 'EASA ORO.FC.230 / KCARs LN 42/2026',
  },
  {
    kind: 'recurrentGround',
    label: 'Recurrent Ground',
    category: 'Operational',
    cycle: { kind: 'months', months: 12 },
    primarySource: 'Operator OM-D / KCARs LN 42/2026 §2.2',
  },
  {
    kind: 'crmTem',
    label: 'CRM / TEM Recurrent',
    category: 'Operational',
    cycle: { kind: 'months', months: 12 },
    primarySource: 'EASA ORO.FC.115 / ICAO Doc 9683',
  },
  {
    kind: 'dangerousGoods',
    label: 'Dangerous Goods',
    category: 'Operational',
    cycle: { kind: 'months', months: 24 },
    primarySource: 'ICAO Doc 9284 / IATA DGR Cat 10',
  },
  {
    kind: 'aviationSecurity',
    label: 'Aviation Security (AVSEC)',
    category: 'Operational',
    cycle: { kind: 'months', months: 24 },
    primarySource: 'ICAO Annex 17 / KCARs LN 31/2026',
  },
  {
    kind: 'aerodromeQualification',
    label: 'Aerodrome Qualification',
    category: 'Operational',
    cycle: { kind: 'per-event', description: 'Per KCAA aerodrome categorisation / OM-B' },
    primarySource: 'KCARs Cat A/B/C aerodrome list',
  },
  {
    kind: 'routeQualification',
    label: 'Route Qualification',
    category: 'Operational',
    cycle: { kind: 'per-event', description: 'Per OpSpec / OM-B' },
    primarySource: 'KCARs LN 29/2026 ops procedures',
  },
  {
    kind: 'picRecency90Day',
    label: 'PIC Recency (90-day, 3 landings)',
    category: 'Operational',
    cycle: { kind: 'days-rolling', days: 90, requirement: '3 take-offs/landings' },
    primarySource: 'ICAO Annex 6 Pt I §9.4.4 / FAA 14 CFR 61.57',
    notes:
      'KCARs LN 50/2026 reg 11 delegates recent-experience specifics to the Authority/operator; ' +
      'the 90-day / 3 take-offs-and-landings figure is the ICAO/FAA standard the scheme adopts.',
  },

  {
    kind: 'sepWetDry',
    label: 'Safety & Emergency Procedures (Wet/Dry alternate)',
    category: 'Safety',
    cycle: { kind: 'months', months: 12 },
    primarySource: 'ICAO Annex 6 / EASA Part-CC',
  },

  {
    kind: 'rvsm',
    label: 'RVSM',
    category: 'Special',
    cycle: { kind: 'months', months: 36 },
    primarySource: 'ICAO Doc 9574 / Operator OM-B',
    notes:
      'Confirm cycle vs operator OM-B; some operators treat as one-off + continuing operational compliance.',
  },
  {
    kind: 'egpwsTaws',
    label: 'EGPWS / TAWS',
    category: 'Special',
    cycle: { kind: 'months', months: 36 },
    primarySource: 'ICAO Annex 6 / EASA CAT.IDE.A.150',
    notes: 'Cycle to confirm against operator OM-B.',
  },
  {
    kind: 'windshear',
    label: 'Windshear (Predictive & Reactive)',
    category: 'Special',
    cycle: { kind: 'months', months: 36 },
    primarySource: 'FAA AC 120-71B / ICAO Doc 9817',
  },
  {
    kind: 'uprt',
    label: 'UPRT (Upset Prevention & Recovery)',
    category: 'Special',
    cycle: { kind: 'months', months: 36 },
    primarySource: 'ICAO Annex 6 Amdt 43 / EASA AMC1 ORO.FC.220 / FAA 14 CFR 121.423',
    notes: 'Split from windshear per Phase-0 audit §2.4.',
  },
  {
    kind: 'catII',
    label: 'Cat II Approach',
    category: 'Special',
    cycle: { kind: 'months', months: 6 },
    primarySource: 'EASA Part-FCL.825 / ICAO Annex 6',
  },
  {
    kind: 'catIII',
    label: 'Cat III Approach',
    category: 'Special',
    cycle: { kind: 'months', months: 6 },
    primarySource: 'EASA Part-FCL.825 / ICAO Annex 6',
  },
  {
    kind: 'crewPairing',
    label: 'Crew Pairing Eligibility',
    category: 'Special',
    cycle: { kind: 'per-event', description: 'Both pilots not low-experience per OM-A' },
    primarySource: 'Operator OM-A § crew pairing rules',
  },
];

const _CATALOG_BY_KIND: ReadonlyMap<CurrencyKind, CurrencyCatalogEntry> = new Map(
  CURRENCY_CATALOG.map((c) => [c.kind, c]),
);

export function lookupCurrency(kind: CurrencyKind): CurrencyCatalogEntry {
  const entry = _CATALOG_BY_KIND.get(kind);
  if (entry === undefined) {
    throw new Error(`Currency kind ${kind} missing from catalog`);
  }
  return entry;
}

/**
 * Class 1 medical certificate validity in months by age — KCARs LN 50/2026
 * (Personnel Licensing), aligned to ICAO Annex 1: 12 months under 40; 6 months
 * at 40 or over (and at 60+ in multi-crew CAT). Use to derive a medical validTo
 * from an issue/renewal date when auto-computing the window.
 */
export function class1MedicalValidityMonths(ageYears: number): 6 | 12 {
  return ageYears >= 40 ? 6 : 12;
}

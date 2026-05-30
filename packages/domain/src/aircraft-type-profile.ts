import type { Brand } from './branded.js';
import { AIRCRAFT_FACTS } from './aircraft.js';

/**
 * Aircraft type profile — the plug-in unit by which the platform supports
 * additional aircraft types (ADR 0006). One profile = one type rating.
 *
 * Discipline:
 *  - Manufacturer facts (engine, APU, MTOW per variant) are public spec data.
 *  - Operational profile (OEI technique, fuel asymmetry, flap policy) is
 *    operator OM-B / TRI-TRE territory. Profiles that haven't been populated
 *    set `operationalProfile.pendingPrimarySource = true`; downstream callers
 *    (AI prompts, exports, knowledge library) MUST treat that flag as a
 *    refusal to invent specifics.
 *  - AI calibration likewise carries `pendingPrimarySource`; an uncalibrated
 *    profile produces a generic examiner prompt rather than a fabricated one.
 */

export type AircraftTypeProfileId = Brand<string, 'AircraftTypeProfileId'>;

export interface AircraftVariant {
  readonly key: string;
  readonly label: string;
  readonly mtowKg: number;
  readonly mlwKg?: number;
  readonly mzfwKg?: number;
  readonly notes?: string;
}

export interface AircraftManufacturerFacts {
  readonly engineDesignation: string;
  readonly apuDesignation?: string;
  readonly hydraulicSystemsCount?: number;
  readonly variants: ReadonlyArray<AircraftVariant>;
}

export interface AircraftOperationalProfile {
  readonly takeoffFlapPolicy?: {
    readonly default: number;
    readonly performance: number;
    readonly reserved: number;
    readonly prohibitedOnContaminatedRunway: number;
    readonly tocwsAlertsOnFlapZero: boolean;
  };
  readonly landingFlaps?: ReadonlyArray<number>;
  readonly oei?: {
    readonly technique: string;
    readonly bankIntoLiveEngineDeg: number;
  };
  readonly maxFuelAsymmetryKgEnroute?: number;
  readonly approachSpeedSource?: string;
  readonly decisionFramework?: string;
  readonly pendingPrimarySource?: boolean;
  readonly notes?: string;
}

export interface AircraftAiCalibration {
  /** Always present. One-sentence description used as the prompt's role anchor. */
  readonly examinerRoleDescription: string;
  /**
   * Optional pre-formatted technical-facts block. When absent the prompt
   * falls back to manufacturer-facts only and avoids type-specific claims.
   */
  readonly technicalFactsBlock?: string;
  /** Optional regulatory-anchor block (KCARs/ICAO/EASA citations). */
  readonly regulatoryAnchors?: string;
  /** Optional quality-requirements block (distractor discipline, etc). */
  readonly qualityRequirements?: string;
  readonly pendingPrimarySource?: boolean;
}

export type AircraftTypeProfileStatus = 'production-ready' | 'preview' | 'draft';

export interface AircraftTypeProfile {
  readonly id: AircraftTypeProfileId;
  readonly shortLabel: string;
  readonly longLabel: string;
  readonly status: AircraftTypeProfileStatus;
  readonly manufacturerFacts: AircraftManufacturerFacts;
  readonly operationalProfile: AircraftOperationalProfile;
  readonly aiCalibration: AircraftAiCalibration;
}

/**
 * FDAP MTOW threshold is regulatory (LN 42/2026 — FDAP as part of the SMS for
 * aeroplanes > 27,000 kg MTOM; the parallel >27,000 kg threshold also appears
 * at LN 29/2026 reg 6(2)(a) for aircraft tracking), not type-specific. Every
 * type with at least one variant > this MTOW must run FDAP. Both F70 and F100
 * qualify.
 */
export const FDAP_MTOW_THRESHOLD_KG = AIRCRAFT_FACTS.fdapMtowThresholdKg;

export function profileExceedsFdapThreshold(profile: AircraftTypeProfile): boolean {
  return profile.manufacturerFacts.variants.some((v) => v.mtowKg > FDAP_MTOW_THRESHOLD_KG);
}

// ----------------------------------------------------------------------------
// F70/100 — production-ready profile (DNCA primary deployment type)
// ----------------------------------------------------------------------------
//
// Constructed from AIRCRAFT_FACTS so the existing single-source-of-truth
// invariant is preserved (ADR 0004).
// ----------------------------------------------------------------------------

export const F70_100_PROFILE_ID = 'F70_100' as AircraftTypeProfileId;

export const F70_100_PROFILE: AircraftTypeProfile = {
  id: F70_100_PROFILE_ID,
  shortLabel: 'F70/100',
  longLabel: 'Fokker 70 and Fokker 100',
  status: 'production-ready',
  manufacturerFacts: {
    engineDesignation: AIRCRAFT_FACTS.engine,
    apuDesignation: AIRCRAFT_FACTS.apu,
    hydraulicSystemsCount: AIRCRAFT_FACTS.hydraulicSystemsCount,
    variants: [
      {
        key: 'F70',
        label: 'F70 (standard)',
        mtowKg: AIRCRAFT_FACTS.variants.F70.mtowKg,
        mlwKg: AIRCRAFT_FACTS.variants.F70.mlwKg,
        mzfwKg: AIRCRAFT_FACTS.variants.F70.mzfwKg,
      },
      {
        key: 'F70-HGW',
        label: 'F70 HGW',
        mtowKg: AIRCRAFT_FACTS.variants['F70-HGW'].mtowKg,
        mlwKg: AIRCRAFT_FACTS.variants['F70-HGW'].mlwKg,
        mzfwKg: AIRCRAFT_FACTS.variants['F70-HGW'].mzfwKg,
        notes: 'High-Gross-Weight variant; 5Y-MMB is the canonical East African example.',
      },
      {
        key: 'F100',
        label: 'F100',
        mtowKg: AIRCRAFT_FACTS.variants.F100.mtowKg,
        mlwKg: AIRCRAFT_FACTS.variants.F100.mlwKg,
        mzfwKg: AIRCRAFT_FACTS.variants.F100.mzfwKg,
      },
    ],
  },
  operationalProfile: {
    takeoffFlapPolicy: {
      default: AIRCRAFT_FACTS.takeoffFlapPolicy.default,
      performance: AIRCRAFT_FACTS.takeoffFlapPolicy.performance,
      reserved: AIRCRAFT_FACTS.takeoffFlapPolicy.reserved,
      prohibitedOnContaminatedRunway:
        AIRCRAFT_FACTS.takeoffFlapPolicy.prohibitedOnContaminatedRunway,
      tocwsAlertsOnFlapZero: AIRCRAFT_FACTS.takeoffFlapPolicy.tocwsAlertsOnFlapZero,
    },
    landingFlaps: AIRCRAFT_FACTS.landingFlaps,
    oei: {
      technique: AIRCRAFT_FACTS.oei.technique,
      bankIntoLiveEngineDeg: AIRCRAFT_FACTS.oei.bankIntoLiveEngineDeg,
    },
    maxFuelAsymmetryKgEnroute: AIRCRAFT_FACTS.maxFuelAsymmetryKgEnroute,
    approachSpeedSource: AIRCRAFT_FACTS.approachSpeedSource,
    decisionFramework: 'T-DODAR',
    notes:
      'SimAero Dinard FR-101 EASA Level C; ZFTT not available; Base Training mandatory ' +
      'post-Skills Test per ICAO Doc 9868 §4.5.1.',
  },
  aiCalibration: {
    examinerRoleDescription:
      'You are a Type Rating Examiner (TRE) for the Fokker 70 and Fokker 100, working within ' +
      'the regulatory framework of KCARs 2025 cross-referenced to ICAO, FAA, and EASA.',
    // technicalFactsBlock and regulatoryAnchors are assembled at prompt-build
    // time by @dnca/prompts from this profile + @dnca/ontology so the truth
    // stays in one place.
  },
};

// ----------------------------------------------------------------------------
// Boeing 737NG — preview profile (proof-of-concept for type-extensibility)
// ----------------------------------------------------------------------------
//
// Populated from public Boeing manufacturer specifications for the 737 Next
// Generation family (737-600/-700/-800/-900ER). Operational technique and AI
// calibration are intentionally left to a TRI/TRE qualified on type — the
// platform refuses to fabricate safety-relevant claims. Maximum take-off
// weight figures vary by Boeing-offered weight option; values below are the
// commonly-published nominal MTOW and must be verified against the operator's
// OpSpec / AFM before promotion to production-ready.
//
// Common East African operators of the 737NG: Kenya Airways (737-700/-800),
// Jambojet, Air Tanzania, RwandAir.
// ----------------------------------------------------------------------------

export const B737_PROFILE_ID = 'B737' as AircraftTypeProfileId;

export const B737_PROFILE: AircraftTypeProfile = {
  id: B737_PROFILE_ID,
  shortLabel: 'B737',
  longLabel: 'Boeing 737 Next Generation (737NG)',
  status: 'preview',
  manufacturerFacts: {
    engineDesignation: 'CFM International CFM56-7B',
    variants: [
      {
        key: 'B737-700',
        label: '737-700',
        mtowKg: 70_080,
        notes: 'Public Boeing spec (nominal MTOW); verify per operator OpSpec before deployment.',
      },
      {
        key: 'B737-800',
        label: '737-800',
        mtowKg: 79_015,
        notes: 'Public Boeing spec (nominal MTOW); verify per operator OpSpec before deployment.',
      },
      {
        key: 'B737-900ER',
        label: '737-900ER',
        mtowKg: 85_139,
        notes: 'Public Boeing spec (nominal MTOW); verify per operator OpSpec before deployment.',
      },
    ],
  },
  operationalProfile: {
    pendingPrimarySource: true,
    notes:
      'Operational profile (takeoff flap policy, OEI technique, fuel asymmetry limits, ' +
      'landing flap selection) must be populated from the operator OM-B and AFM by a ' +
      'TRI/TRE qualified on type before this profile is promoted to production-ready. ' +
      'The 737 MAX (CFM LEAP-1B) is a distinct type rating and is not covered by this profile.',
  },
  aiCalibration: {
    examinerRoleDescription:
      'You are a Type Rating Examiner (TRE) for the Boeing 737 Next Generation, working ' +
      'within the regulatory framework of KCARs 2025 cross-referenced to ICAO, FAA, and EASA.',
    pendingPrimarySource: true,
  },
};

// ----------------------------------------------------------------------------
// Draft registry stubs — common Kenyan-registry types.
//
// These exist so the type selector lists the fleet an East African operator
// actually flies. They carry ONLY public manufacturer facts (engine, nominal
// MTOW — flagged "verify per operator OpSpec/AFM"); operational technique and
// AI calibration are pendingPrimarySource and MUST be populated by a TRI/TRE
// qualified on type (a Phase-1 content task) before any promotion. The
// platform refuses to fabricate safety-relevant claims (CLAUDE.md).
// MTOW figures are nominal public specs; their only computed use here is the
// FDAP >27,000 kg flag, where every value sits well clear of the threshold.
// ----------------------------------------------------------------------------

function draftStub(args: {
  id: string;
  shortLabel: string;
  longLabel: string;
  engineDesignation: string;
  variants: ReadonlyArray<AircraftVariant>;
  examinerType: string;
}): AircraftTypeProfile {
  return {
    id: args.id as AircraftTypeProfileId,
    shortLabel: args.shortLabel,
    longLabel: args.longLabel,
    status: 'draft',
    manufacturerFacts: {
      engineDesignation: args.engineDesignation,
      variants: args.variants,
    },
    operationalProfile: {
      pendingPrimarySource: true,
      notes:
        'Draft stub — operational profile (flap policy, OEI technique, fuel asymmetry, ' +
        'landing flaps, approach-speed source) to be populated from the operator OM-B/AFM by a ' +
        'TRI/TRE qualified on type before any promotion. No technique is asserted.',
    },
    aiCalibration: {
      examinerRoleDescription: `You are a Type Rating Examiner (TRE) for the ${args.examinerType}, working within the regulatory framework of KCARs 2025 cross-referenced to ICAO, FAA, and EASA.`,
      pendingPrimarySource: true,
    },
  };
}

const vNote = 'Public nominal spec; verify per operator OpSpec/AFM before deployment.';

export const B737_CLASSIC_PROFILE = draftStub({
  id: 'B737_CLASSIC',
  shortLabel: 'B737 Classic',
  longLabel: 'Boeing 737 Classic (300/400/500)',
  engineDesignation: 'CFM International CFM56-3',
  examinerType: 'Boeing 737 Classic (300/400/500)',
  variants: [
    { key: 'B737-300', label: '737-300', mtowKg: 56_470, notes: vNote },
    { key: 'B737-400', label: '737-400', mtowKg: 68_040, notes: vNote },
    { key: 'B737-500', label: '737-500', mtowKg: 60_550, notes: vNote },
  ],
});

export const C208_PROFILE = draftStub({
  id: 'C208',
  shortLabel: 'C208',
  longLabel: 'Cessna 208 Caravan / 208B Grand Caravan',
  engineDesignation: 'Pratt & Whitney Canada PT6A-114A',
  examinerType: 'Cessna 208 Caravan',
  variants: [
    { key: 'C208', label: '208 Caravan', mtowKg: 3_629, notes: vNote },
    { key: 'C208B', label: '208B Grand Caravan', mtowKg: 3_995, notes: vNote },
  ],
});

export const DHC8_PROFILE = draftStub({
  id: 'DHC8',
  shortLabel: 'DHC-8',
  longLabel: 'De Havilland Canada Dash 8 / Q400',
  engineDesignation: 'Pratt & Whitney Canada PW123 / PW150A',
  examinerType: 'Dash 8 / Q400',
  variants: [
    { key: 'DHC8-300', label: 'Dash 8-300', mtowKg: 19_505, notes: vNote },
    { key: 'DHC8-400', label: 'Q400 (Dash 8-400)', mtowKg: 29_574, notes: vNote },
  ],
});

export const ATR_PROFILE = draftStub({
  id: 'ATR',
  shortLabel: 'ATR 42/72',
  longLabel: 'ATR 42 / ATR 72',
  engineDesignation: 'Pratt & Whitney Canada PW127',
  examinerType: 'ATR 42/72',
  variants: [
    { key: 'ATR42-600', label: 'ATR 42-600', mtowKg: 18_600, notes: vNote },
    { key: 'ATR72-600', label: 'ATR 72-600', mtowKg: 23_000, notes: vNote },
  ],
});

export const EJET_PROFILE = draftStub({
  id: 'EJET',
  shortLabel: 'E170/190',
  longLabel: 'Embraer E-Jets (E170 / E190)',
  engineDesignation: 'General Electric CF34-8E / CF34-10E',
  examinerType: 'Embraer E-Jets (E170/E190)',
  variants: [
    { key: 'E170', label: 'E170', mtowKg: 37_200, notes: vNote },
    { key: 'E190', label: 'E190', mtowKg: 51_800, notes: vNote },
  ],
});

// ----------------------------------------------------------------------------
// Registry
// ----------------------------------------------------------------------------

export const AIRCRAFT_TYPE_PROFILES: ReadonlyArray<AircraftTypeProfile> = [
  F70_100_PROFILE,
  B737_PROFILE,
  B737_CLASSIC_PROFILE,
  C208_PROFILE,
  DHC8_PROFILE,
  ATR_PROFILE,
  EJET_PROFILE,
];

const _PROFILES_BY_ID = new Map<AircraftTypeProfileId, AircraftTypeProfile>(
  AIRCRAFT_TYPE_PROFILES.map((p) => [p.id, p]),
);

export function getAircraftTypeProfile(id: AircraftTypeProfileId): AircraftTypeProfile {
  const profile = _PROFILES_BY_ID.get(id);
  if (!profile) {
    throw new Error(`Unknown AircraftTypeProfile id: ${id}`);
  }
  return profile;
}

export function tryGetAircraftTypeProfile(id: string): AircraftTypeProfile | undefined {
  return _PROFILES_BY_ID.get(id as AircraftTypeProfileId);
}

export function isProductionReady(profile: AircraftTypeProfile): boolean {
  return (
    profile.status === 'production-ready' &&
    profile.operationalProfile.pendingPrimarySource !== true &&
    profile.aiCalibration.pendingPrimarySource !== true
  );
}

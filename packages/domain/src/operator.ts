import type { IsoDateTime, OperatorId } from './branded.js';

/**
 * Tenant root. All other entities scope under an OperatorId via row-level security.
 *
 * stabilisedApproachGate values are operator OM-A configuration; LN 42/2026 §2.1.25
 * does not prescribe gate heights — see CLAUDE.md.
 */
export interface Operator {
  id: OperatorId;
  legalName: string;
  tradingName: string;
  shortCode: string;
  aocNumber: string;
  countryIso2: 'KE';
  odpcRegistrationNumber?: string;
  accountableManagerName: string;
  accountableManagerEmail: string;
  status: 'active' | 'inactive' | 'archived';
  config: OperatorConfig;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface OperatorConfig {
  stabilisedApproachGate: {
    imcFeetAal: number;
    vmcFeetAal: number;
  };
  gradingScale: 'AS-S-MS-BS' | 'ICAO-1-5';
  fuelPolicy: {
    contingencyPercent: 5 | 3;
    finalReserveMinutes: 30 | 45;
  };
  opSpecs: {
    rvsm: boolean;
    rnp: boolean;
    catII: boolean;
    catIII: boolean;
    lvo: boolean;
    edto: boolean;
  };
  branding: {
    primaryColour: string;
    accentColour: string;
    logoUrl?: string;
  };
}

export const DEFAULT_OPERATOR_CONFIG = (): OperatorConfig => ({
  stabilisedApproachGate: { imcFeetAal: 1000, vmcFeetAal: 500 },
  gradingScale: 'AS-S-MS-BS',
  fuelPolicy: { contingencyPercent: 5, finalReserveMinutes: 30 },
  opSpecs: { rvsm: true, rnp: true, catII: false, catIII: false, lvo: false, edto: false },
  branding: { primaryColour: '#0f172a', accentColour: '#f59e0b' },
});

// ---------------------------------------------------------------------------
// Operator onboarding (multi-tenant cutover) — the pure core a provisioning
// script or admin UI calls to turn a vetted onboarding spec into the Operator
// row that seeds a new tenant. Validation is explicit (domain stays zod-free);
// the API boundary still zod-validates the HTTP body before calling this.
// ---------------------------------------------------------------------------

/** Per-sub-object overrides applied on top of DEFAULT_OPERATOR_CONFIG. */
export interface OperatorConfigOverrides {
  stabilisedApproachGate?: Partial<OperatorConfig['stabilisedApproachGate']>;
  gradingScale?: OperatorConfig['gradingScale'];
  fuelPolicy?: Partial<OperatorConfig['fuelPolicy']>;
  opSpecs?: Partial<OperatorConfig['opSpecs']>;
  branding?: Partial<OperatorConfig['branding']>;
}

export interface OperatorOnboardingSpec {
  legalName: string;
  tradingName: string;
  /** 2–16 chars, alphanumerics and dashes — used in export filenames + URLs. */
  shortCode: string;
  aocNumber: string;
  accountableManagerName: string;
  accountableManagerEmail: string;
  odpcRegistrationNumber?: string;
  configOverrides?: OperatorConfigOverrides;
}

const SHORT_CODE_RE = /^[A-Za-z0-9][A-Za-z0-9-]{1,15}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function mergeOperatorConfig(overrides?: OperatorConfigOverrides): OperatorConfig {
  const base = DEFAULT_OPERATOR_CONFIG();
  if (!overrides) return base;
  return {
    stabilisedApproachGate: {
      ...base.stabilisedApproachGate,
      ...overrides.stabilisedApproachGate,
    },
    gradingScale: overrides.gradingScale ?? base.gradingScale,
    fuelPolicy: { ...base.fuelPolicy, ...overrides.fuelPolicy },
    opSpecs: { ...base.opSpecs, ...overrides.opSpecs },
    branding: { ...base.branding, ...overrides.branding },
  };
}

/**
 * Pure: validate an onboarding spec and produce the Operator row for a new
 * tenant. `id` and `now` are passed in so the result is deterministic and
 * testable; the caller supplies a fresh UUID and timestamp. Throws on invalid
 * input — the messages are safe to surface to an onboarding operator.
 */
export function resolveOperatorOnboarding(
  spec: OperatorOnboardingSpec,
  ctx: { id: OperatorId; now: IsoDateTime },
): Operator {
  const legalName = spec.legalName.trim();
  const tradingName = spec.tradingName.trim();
  const shortCode = spec.shortCode.trim();
  const aocNumber = spec.aocNumber.trim();
  const accountableManagerName = spec.accountableManagerName.trim();
  const accountableManagerEmail = spec.accountableManagerEmail.trim();

  if (legalName.length === 0) throw new Error('Operator legalName is required');
  if (tradingName.length === 0) throw new Error('Operator tradingName is required');
  if (!SHORT_CODE_RE.test(shortCode)) {
    throw new Error('Operator shortCode must be 2–16 alphanumeric/dash characters');
  }
  if (aocNumber.length === 0) throw new Error('Operator aocNumber is required');
  if (accountableManagerName.length === 0) throw new Error('accountableManagerName is required');
  if (!EMAIL_RE.test(accountableManagerEmail)) {
    throw new Error('accountableManagerEmail must be a valid email address');
  }

  return {
    id: ctx.id,
    legalName,
    tradingName,
    shortCode,
    aocNumber,
    countryIso2: 'KE',
    ...(spec.odpcRegistrationNumber !== undefined
      ? { odpcRegistrationNumber: spec.odpcRegistrationNumber.trim() }
      : {}),
    accountableManagerName,
    accountableManagerEmail,
    status: 'active',
    config: mergeOperatorConfig(spec.configOverrides),
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
}

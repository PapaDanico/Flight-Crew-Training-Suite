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

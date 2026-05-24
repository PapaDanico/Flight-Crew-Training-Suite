import type { AircraftId, FleetId, IsoDate, OperatorId } from './branded.js';

export const AIRCRAFT_TYPE = ['F70', 'F100'] as const;
export type AircraftType = (typeof AIRCRAFT_TYPE)[number];

export const FLEET_VARIANT = ['F70', 'F70-HGW', 'F100'] as const;
export type FleetVariant = (typeof FLEET_VARIANT)[number];

export interface Fleet {
  id: FleetId;
  operatorId: OperatorId;
  variant: FleetVariant;
  displayName: string;
  active: boolean;
}

export interface Aircraft {
  id: AircraftId;
  operatorId: OperatorId;
  fleetId: FleetId;
  registration: string;
  variant: FleetVariant;
  mtowKg: number;
  mlwKg: number;
  mzfwKg: number;
  serialNumber?: string;
  deliveredOn?: IsoDate;
  active: boolean;
}

/**
 * F70/100 type facts treated as project-of-truth constants.
 *
 * Both F70 and F100 share the RR Tay Mk.620-15 engine and AlliedSignal GTCP36-150-RR APU.
 * Three independent hydraulic systems (1, 2, 3).
 * 5Y-MMB is the HGW variant operated by Jubba Airways Kenya.
 *
 * Source: CLAUDE.md §"Critical F70/100 technical facts"; values must remain authoritative.
 */
export const AIRCRAFT_FACTS = {
  engine: 'Rolls-Royce Tay Mk.620-15',
  apu: 'AlliedSignal GTCP36-150-RR',
  hydraulicSystemsCount: 3,
  variants: {
    F70: { mtowKg: 37_995, mlwKg: 35_835, mzfwKg: 32_205 },
    'F70-HGW': { mtowKg: 39_915, mlwKg: 35_835, mzfwKg: 33_565 },
    F100: { mtowKg: 44_450, mlwKg: 38_780, mzfwKg: 35_830 },
  },
  takeoffFlapPolicy: {
    default: 0,
    performance: 8,
    reserved: 15,
    prohibitedOnContaminatedRunway: 0,
    tocwsAlertsOnFlapZero: false,
  },
  landingFlaps: [25, 42] as const,
  maxFuelAsymmetryKgEnroute: 1_000,
  oei: {
    technique: 'PPAA',
    bankIntoLiveEngineDeg: 5,
  },
  approachSpeedSource: 'VMA-from-PFD',
  fdapMtowThresholdKg: 27_000,
} as const;

export type AircraftFacts = typeof AIRCRAFT_FACTS;

export function exceedsFdapThreshold(mtowKg: number): boolean {
  return mtowKg > AIRCRAFT_FACTS.fdapMtowThresholdKg;
}

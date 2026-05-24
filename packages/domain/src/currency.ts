import type {
  CurrencyRecordId,
  IsoDate,
  IsoDateTime,
  OperatorId,
  PilotId,
  SessionId,
  UserId,
} from './branded.js';
import { isInTraining, type TrainingPhase } from './pilot.js';

export const CURRENCY_CATEGORY = ['Personal', 'Type', 'Operational', 'Safety', 'Special'] as const;
export type CurrencyCategory = (typeof CURRENCY_CATEGORY)[number];

export const CURRENCY_STATUS = [
  'CURRENT',
  'CAUTION',
  'ACTION',
  'EXPIRED',
  'NOT_APPLICABLE',
] as const;
export type CurrencyStatus = (typeof CURRENCY_STATUS)[number];

/**
 * Threshold edges per CLAUDE.md §"Currency calculations":
 *  - CURRENT: > 90 days to expiry
 *  - CAUTION: 31..90 days
 *  - ACTION:  1..30 days
 *  - EXPIRED: <= 0 days
 */
export const STATUS_THRESHOLDS = {
  cautionMaxDays: 90,
  actionMaxDays: 30,
} as const;

/**
 * The kind of a currency item is a domain-stable enum. Values added here must come
 * with a matching CurrencyCatalogEntry in currency-catalog.ts.
 */
export const CURRENCY_KIND = [
  'class1Medical',
  'atplCpl',
  'elpLevel',
  'passportVisa',
  'typeRating',
  'opc',
  'lpc',
  'lineCheck',
  'recurrentGround',
  'crmTem',
  'dangerousGoods',
  'aviationSecurity',
  'aerodromeQualification',
  'routeQualification',
  'picRecency90Day',
  'sepWetDry',
  'rvsm',
  'egpwsTaws',
  'windshear',
  'uprt',
  'catII',
  'catIII',
  'crewPairing',
] as const;
export type CurrencyKind = (typeof CURRENCY_KIND)[number];

/**
 * The set of currency kinds that may legitimately be NOT_APPLICABLE while a pilot
 * is in initial type rating. Medical, ATPL/CPL, ELP and personal documents are
 * NOT in this set — they are required regardless of phase.
 *
 * See Phase-0 audit finding §2.2.
 */
export const ITR_NA_ELIGIBLE: ReadonlySet<CurrencyKind> = new Set<CurrencyKind>([
  'typeRating',
  'opc',
  'lpc',
  'lineCheck',
  'recurrentGround',
  'routeQualification',
  'aerodromeQualification',
  'picRecency90Day',
  'crewPairing',
  'catII',
  'catIII',
]);

export function mayBeNotApplicable(kind: CurrencyKind, phase: TrainingPhase): boolean {
  return isInTraining(phase) && ITR_NA_ELIGIBLE.has(kind);
}

/**
 * A currency record is the operational fact of "Pilot X holds currency Y valid
 * from A to B, sourced from training Z." Currency records are append-only at the
 * audit-log layer — new validity windows are new rows, not in-place updates.
 */
export interface CurrencyRecord {
  id: CurrencyRecordId;
  operatorId: OperatorId;
  pilotId: PilotId;
  kind: CurrencyKind;
  validFrom: IsoDate;
  validTo: IsoDate;
  sourceSessionId?: SessionId;
  issuedByUserId?: UserId;
  notes?: string;
  attachmentUrls?: readonly string[];
  supersededAt?: IsoDateTime;
  supersededBy?: CurrencyRecordId;
  createdAt: IsoDateTime;
}

export interface PicRecencyState {
  pilotId: PilotId;
  operatorId: OperatorId;
  rollingWindowDays: 90;
  requiredLandings: 3;
  landingsInWindow: number;
  asOf: IsoDateTime;
}

export function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  const fromMs = Date.parse(fromIsoDate);
  const toMs = Date.parse(toIsoDate);
  return Math.ceil((toMs - fromMs) / (1000 * 60 * 60 * 24));
}

export function statusFor(args: {
  kind: CurrencyKind;
  phase: TrainingPhase;
  validTo?: IsoDate | undefined;
  asOf: IsoDate;
}): CurrencyStatus {
  if (args.validTo === undefined) {
    return mayBeNotApplicable(args.kind, args.phase) ? 'NOT_APPLICABLE' : 'EXPIRED';
  }
  const daysToExpiry = daysBetween(args.asOf, args.validTo);
  if (daysToExpiry <= 0) return 'EXPIRED';
  if (daysToExpiry <= STATUS_THRESHOLDS.actionMaxDays) return 'ACTION';
  if (daysToExpiry <= STATUS_THRESHOLDS.cautionMaxDays) return 'CAUTION';
  return 'CURRENT';
}

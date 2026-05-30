import type { IsoDate, OperatorId, PilotId } from './branded.js';
import {
  daysBetween,
  statusFor,
  type CurrencyKind,
  type CurrencyRecord,
  type CurrencyStatus,
} from './currency.js';
import { lookupCurrency } from './currency-catalog.js';
import type { Pilot } from './pilot.js';

/**
 * Training-scheduling seam — the integration contract between the FCTS
 * (system-of-record for training currency) and the sister rostering platform
 * (Ratiba).
 *
 * The FCTS knows *when* a currency is about to lapse; the roster system knows
 * how to reserve a duty-free window and a simulator slot. Rather than couple
 * the two, the FCTS emits a typed, side-effect-free **TrainingDueEvent** for
 * every currency that needs a booking inside a planning horizon. The roster
 * system consumes those events; the FCTS UI renders the same list as a
 * scheduling worklist. One contract, two consumers.
 *
 * This module is pure: given pilots + currency records + an as-of date it
 * returns the events. Transport (webhook/queue) and the booking action live at
 * the edges.
 */

/** Schema version for the event contract — bump on any breaking field change. */
export const TRAINING_DUE_EVENT_VERSION = '1' as const;

/**
 * Currencies that are renewed by a *bookable* activity (a check, a course, a
 * medical) and therefore belong on a scheduling worklist. Personal documents
 * (passport/visa, ELP) and per-event operational qualifications are excluded —
 * they are tracked but not "scheduled" in this sense.
 */
export const SCHEDULABLE_KINDS = [
  'class1Medical',
  'opc',
  'lpc',
  'lineCheck',
  'recurrentGround',
  'crmTem',
  'sepWetDry',
  'dangerousGoods',
  'aviationSecurity',
] as const;
export type SchedulableKind = (typeof SCHEDULABLE_KINDS)[number];

const SCHEDULABLE_SET: ReadonlySet<CurrencyKind> = new Set(SCHEDULABLE_KINDS);

/** Currencies renewed in a simulator — the roster system must reserve a sim slot. */
const SIM_SLOT_KINDS: ReadonlySet<CurrencyKind> = new Set<CurrencyKind>(['opc', 'lpc']);

/**
 * Booking lead time (days before expiry) by which the slot should be secured.
 * Sim-based checks need the most runway; ground/admin renewals less.
 */
const BOOKING_LEAD_DAYS: Partial<Record<CurrencyKind, number>> = {
  opc: 45,
  lpc: 45,
  lineCheck: 30,
  class1Medical: 30,
  recurrentGround: 21,
  crmTem: 21,
  sepWetDry: 21,
  dangerousGoods: 14,
  aviationSecurity: 14,
};
const DEFAULT_LEAD_DAYS = 21;

export type DueStatus = Extract<CurrencyStatus, 'CAUTION' | 'ACTION' | 'EXPIRED'>;
export type Urgency = 'OVERDUE' | 'BOOK_NOW' | 'PLAN';

export interface TrainingDueEvent {
  readonly eventVersion: typeof TRAINING_DUE_EVENT_VERSION;
  readonly operatorId: OperatorId;
  readonly pilotId: PilotId;
  readonly pilotName: string;
  readonly kind: CurrencyKind;
  readonly label: string;
  readonly validTo: IsoDate;
  readonly status: DueStatus;
  readonly daysToExpiry: number;
  /** validTo minus the booking lead time for this kind. */
  readonly bookByDate: IsoDate;
  /** True when asOf is already past bookByDate — the slot should already exist. */
  readonly bookingOverdue: boolean;
  /** True for sim-based checks (OPC/LPC) — roster must reserve a simulator slot. */
  readonly requiresSimSlot: boolean;
  readonly urgency: Urgency;
}

function addDaysIso(iso: IsoDate, days: number): IsoDate {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10) as IsoDate;
}

function urgencyFor(status: DueStatus): Urgency {
  if (status === 'EXPIRED') return 'OVERDUE';
  if (status === 'ACTION') return 'BOOK_NOW';
  return 'PLAN';
}

/** Latest non-superseded currency record per (pilot, kind). */
function latestByPilotKind(
  records: ReadonlyArray<CurrencyRecord>,
): ReadonlyMap<string, CurrencyRecord> {
  const m = new Map<string, CurrencyRecord>();
  for (const r of records) {
    if (r.supersededAt !== undefined) continue;
    const key = `${r.pilotId}|${r.kind}`;
    const existing = m.get(key);
    if (existing === undefined || Date.parse(r.createdAt) >= Date.parse(existing.createdAt)) {
      m.set(key, r);
    }
  }
  return m;
}

export interface ComputeTrainingDueArgs {
  readonly pilots: ReadonlyArray<Pilot>;
  readonly currencyRecords: ReadonlyArray<CurrencyRecord>;
  readonly asOf: IsoDate;
  /** Only surface items whose expiry is within this many days (default 90). */
  readonly horizonDays?: number;
}

/**
 * Pure: the set of training-due events across the given crew, sorted most-urgent
 * first (expired, then soonest expiry). Skips NOT_APPLICABLE and still-current
 * (beyond-horizon) items, and any kind that is not bookable-schedulable.
 */
export function computeTrainingDueEvents(args: ComputeTrainingDueArgs): TrainingDueEvent[] {
  const horizon = args.horizonDays ?? 90;
  const index = latestByPilotKind(args.currencyRecords);
  const events: TrainingDueEvent[] = [];

  for (const pilot of args.pilots) {
    if (!pilot.active) continue;
    for (const kind of SCHEDULABLE_KINDS) {
      const rec = index.get(`${pilot.id}|${kind}`);
      const status = statusFor({
        kind,
        phase: pilot.phase,
        validTo: rec?.validTo,
        asOf: args.asOf,
      });
      if (status !== 'CAUTION' && status !== 'ACTION' && status !== 'EXPIRED') continue;
      // Need a concrete expiry to schedule against. A schedulable kind with no
      // record at all (status EXPIRED) is a records gap, not a booking — leave
      // it to the currency tracker rather than the scheduling worklist.
      if (rec?.validTo === undefined) continue;

      const daysToExpiry = daysBetween(args.asOf, rec.validTo);
      if (daysToExpiry > horizon) continue;

      const lead = BOOKING_LEAD_DAYS[kind] ?? DEFAULT_LEAD_DAYS;
      const bookByDate = addDaysIso(rec.validTo, -lead);

      events.push({
        eventVersion: TRAINING_DUE_EVENT_VERSION,
        operatorId: pilot.operatorId,
        pilotId: pilot.id,
        pilotName: pilot.fullName,
        kind,
        label: lookupCurrency(kind).label,
        validTo: rec.validTo,
        status,
        daysToExpiry,
        bookByDate,
        bookingOverdue: daysBetween(args.asOf, bookByDate) <= 0,
        requiresSimSlot: SIM_SLOT_KINDS.has(kind),
        urgency: urgencyFor(status),
      });
    }
  }

  events.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  return events;
}

export function isSchedulableKind(kind: CurrencyKind): kind is SchedulableKind {
  return SCHEDULABLE_SET.has(kind);
}

/** Convenience: group events by urgency band for a worklist UI. */
export function groupTrainingDueByUrgency(
  events: ReadonlyArray<TrainingDueEvent>,
): Record<Urgency, TrainingDueEvent[]> {
  const groups: Record<Urgency, TrainingDueEvent[]> = { OVERDUE: [], BOOK_NOW: [], PLAN: [] };
  for (const e of events) groups[e.urgency].push(e);
  return groups;
}

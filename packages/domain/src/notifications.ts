import type { IsoDate, OperatorId, PilotId } from './branded.js';
import {
  CURRENCY_KIND,
  daysBetween,
  statusFor,
  type CurrencyKind,
  type CurrencyRecord,
} from './currency.js';
import { lookupCurrency } from './currency-catalog.js';
import type { Pilot } from './pilot.js';

/**
 * Notification engine (Sprint 3) — pure computation of currency-expiry alerts.
 *
 * Given the crew and their currency records, returns one alert per (pilot,
 * kind) that has entered the expiry cascade, tagged with the threshold band it
 * has crossed and a severity. Dispatch (email/SMS/Telegram) and once-per-band
 * de-duplication live at the edges; this function is side-effect-free and uses
 * the same statusFor()/daysBetween() as the dashboard so the numbers match.
 */

/** Cascade thresholds (days to expiry), widest first — per CLAUDE.md. */
export const NOTIFICATION_THRESHOLDS_DAYS = [90, 60, 30, 14, 7] as const;
export type NotificationThreshold = (typeof NOTIFICATION_THRESHOLDS_DAYS)[number];

export type NotificationSeverity = 'INFO' | 'WARN' | 'URGENT' | 'EXPIRED';
export type NotificationChannel = 'EMAIL' | 'SMS' | 'TELEGRAM';

export interface ExpiryNotification {
  readonly operatorId: OperatorId;
  readonly pilotId: PilotId;
  readonly pilotName: string;
  readonly kind: CurrencyKind;
  readonly label: string;
  readonly validTo: IsoDate;
  readonly daysToExpiry: number;
  /** Widest cascade band entered (90/60/30/14/7), or 0 once expired. */
  readonly thresholdDays: NotificationThreshold | 0;
  readonly severity: NotificationSeverity;
  /** Suggested dispatch channels for this severity (operator may override). */
  readonly channels: ReadonlyArray<NotificationChannel>;
}

function severityFor(daysToExpiry: number): NotificationSeverity {
  if (daysToExpiry <= 0) return 'EXPIRED';
  if (daysToExpiry <= 14) return 'URGENT';
  if (daysToExpiry <= 30) return 'WARN';
  return 'INFO';
}

function channelsFor(severity: NotificationSeverity): ReadonlyArray<NotificationChannel> {
  switch (severity) {
    case 'EXPIRED':
    case 'URGENT':
      return ['EMAIL', 'SMS', 'TELEGRAM'];
    case 'WARN':
      return ['EMAIL', 'TELEGRAM'];
    default:
      return ['EMAIL'];
  }
}

/** The widest threshold band the item has entered (smallest T with days <= T). */
function thresholdFor(daysToExpiry: number): NotificationThreshold | 0 {
  if (daysToExpiry <= 0) return 0;
  for (const t of [...NOTIFICATION_THRESHOLDS_DAYS].sort((a, b) => a - b)) {
    if (daysToExpiry <= t) return t;
  }
  return 90;
}

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

/** Every currency kind is notifiable (personal docs, type, operational, …). */
const CURRENCY_KINDS_TO_NOTIFY: ReadonlyArray<CurrencyKind> = CURRENCY_KIND;

export interface ComputeNotificationsArgs {
  readonly pilots: ReadonlyArray<Pilot>;
  readonly currencyRecords: ReadonlyArray<CurrencyRecord>;
  readonly asOf: IsoDate;
}

/**
 * Pure: one ExpiryNotification per (active pilot, currency kind) inside the
 * 90-day cascade, most-urgent first. Excludes NOT_APPLICABLE items, items with
 * no record, inactive pilots, and items more than 90 days out.
 */
export function computeDueNotifications(args: ComputeNotificationsArgs): ExpiryNotification[] {
  const index = latestByPilotKind(args.currencyRecords);
  const out: ExpiryNotification[] = [];

  for (const pilot of args.pilots) {
    if (!pilot.active) continue;
    for (const c of CURRENCY_KINDS_TO_NOTIFY) {
      const rec = index.get(`${pilot.id}|${String(c)}`);
      if (rec?.validTo === undefined) continue;
      const status = statusFor({
        kind: c,
        phase: pilot.phase,
        validTo: rec.validTo,
        asOf: args.asOf,
      });
      if (status === 'NOT_APPLICABLE' || status === 'CURRENT') continue;

      const daysToExpiry = daysBetween(args.asOf, rec.validTo);
      const severity = severityFor(daysToExpiry);
      out.push({
        operatorId: pilot.operatorId,
        pilotId: pilot.id,
        pilotName: pilot.fullName,
        kind: c,
        label: lookupCurrency(c).label,
        validTo: rec.validTo,
        daysToExpiry,
        thresholdDays: thresholdFor(daysToExpiry),
        severity,
        channels: channelsFor(severity),
      });
    }
  }

  out.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  return out;
}

// ---------------------------------------------------------------------------
// Dispatch (dry-run) — turns the alert set into the per-recipient messages a
// sender would emit, without any side effect or provider. Each crew member
// gets one digest message per channel required by their most-severe item; the
// provider-backed sender + per-band de-dup + AuditEvent land in a later slice.
// ---------------------------------------------------------------------------

export interface DispatchMessage {
  readonly operatorId: OperatorId;
  readonly pilotId: PilotId;
  readonly pilotName: string;
  readonly channel: NotificationChannel;
  /** Most-severe item in the digest. */
  readonly severity: NotificationSeverity;
  readonly subject: string;
  /** One line per currency item, e.g. "Class 1 Medical — 12d (URGENT)". */
  readonly lines: ReadonlyArray<string>;
}

export interface DispatchPlan {
  readonly dryRun: true;
  readonly messages: ReadonlyArray<DispatchMessage>;
  readonly recipientCount: number;
  readonly byChannel: Record<NotificationChannel, number>;
}

const SEVERITY_RANK: Record<NotificationSeverity, number> = {
  INFO: 0,
  WARN: 1,
  URGENT: 2,
  EXPIRED: 3,
};

function lineFor(n: ExpiryNotification): string {
  const when = n.daysToExpiry <= 0 ? `${Math.abs(n.daysToExpiry)}d overdue` : `${n.daysToExpiry}d`;
  return `${n.label} — ${when} (${n.severity})`;
}

/**
 * Pure: the dry-run dispatch plan for a set of notifications. Groups by pilot,
 * derives the channels from the pilot's most-severe item, and renders one
 * digest message per (pilot, channel).
 */
export function planNotificationDispatch(
  notifications: ReadonlyArray<ExpiryNotification>,
): DispatchPlan {
  const byPilot = new Map<string, ExpiryNotification[]>();
  for (const n of notifications) {
    const arr = byPilot.get(n.pilotId) ?? [];
    arr.push(n);
    byPilot.set(n.pilotId, arr);
  }

  const messages: DispatchMessage[] = [];
  const byChannel: Record<NotificationChannel, number> = { EMAIL: 0, SMS: 0, TELEGRAM: 0 };

  for (const items of byPilot.values()) {
    const top = items.reduce((a, b) =>
      SEVERITY_RANK[b.severity] > SEVERITY_RANK[a.severity] ? b : a,
    );
    const lines = [...items].sort((a, b) => a.daysToExpiry - b.daysToExpiry).map(lineFor);
    const subject = `${items.length} currency item${items.length === 1 ? '' : 's'} need attention`;
    for (const channel of channelsFor(top.severity)) {
      byChannel[channel] += 1;
      messages.push({
        operatorId: top.operatorId,
        pilotId: top.pilotId,
        pilotName: top.pilotName,
        channel,
        severity: top.severity,
        subject,
        lines,
      });
    }
  }

  return { dryRun: true, messages, recipientCount: byPilot.size, byChannel };
}

// ---------------------------------------------------------------------------
// Per-band de-duplication — so a recipient is alerted once per cascade band,
// not on every run. A notification is keyed by (pilot, kind, thresholdDays);
// crossing into a narrower band (90→60→30→14→7→expired) mints a fresh key and
// therefore a fresh alert, while a re-run inside the same band is suppressed.
// The ledger of already-sent keys is persisted at the edge (a table written
// when a real send succeeds); this function stays pure.
// ---------------------------------------------------------------------------

/** Stable key for one (pilot, kind, cascade-band) alert. */
export function notificationDedupeKey(n: ExpiryNotification): string {
  return `${n.pilotId}|${String(n.kind)}|${n.thresholdDays}`;
}

export interface DedupeResult {
  /** Notifications not yet sent for their current band, most-urgent first. */
  readonly fresh: ReadonlyArray<ExpiryNotification>;
  /** Keys to record once these are dispatched (fresh ∖ alreadySent). */
  readonly newKeys: ReadonlyArray<string>;
  /** How many were suppressed because their band was already notified. */
  readonly suppressedCount: number;
}

/**
 * Pure: split a notification set into the alerts that still need sending for
 * their current cascade band versus those already covered by `alreadySent`.
 * Pass `result.newKeys` to the ledger only after the dispatch succeeds.
 */
export function dedupeNotifications(
  notifications: ReadonlyArray<ExpiryNotification>,
  alreadySent: ReadonlySet<string>,
): DedupeResult {
  const fresh: ExpiryNotification[] = [];
  const newKeys: string[] = [];
  const seen = new Set<string>();
  let suppressedCount = 0;
  for (const n of notifications) {
    const key = notificationDedupeKey(n);
    if (alreadySent.has(key) || seen.has(key)) {
      suppressedCount += 1;
      continue;
    }
    seen.add(key);
    fresh.push(n);
    newKeys.push(key);
  }
  return { fresh, newKeys, suppressedCount };
}

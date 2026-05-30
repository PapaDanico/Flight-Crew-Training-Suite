import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeDueNotifications,
  dedupeNotifications,
  notificationDedupeKey,
  type ExpiryNotification,
} from '../src/notifications.js';
import type { CurrencyRecord } from '../src/currency.js';
import type { Pilot } from '../src/pilot.js';
import type {
  CurrencyRecordId,
  FleetId,
  IsoDate,
  IsoDateTime,
  OperatorId,
  PilotId,
} from '../src/branded.js';

const ASOF = '2026-05-24' as IsoDate;
const OP = 'op-1' as OperatorId;

function offsetIso(days: number): IsoDate {
  const d = new Date(`${ASOF}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10) as IsoDate;
}
function pilot(id: string): Pilot {
  return {
    id: id as PilotId,
    operatorId: OP,
    fleetId: 'f-1' as FleetId,
    fullName: `Capt. ${id}`,
    licenceNumber: `KCAA/DEMO/ATPL/${id}`,
    role: 'Captain',
    baseIcao: 'HKJK',
    phase: 'Line',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z' as IsoDateTime,
    updatedAt: '2026-01-01T00:00:00.000Z' as IsoDateTime,
  };
}
function record(pilotId: string, kind: CurrencyRecord['kind'], days: number): CurrencyRecord {
  return {
    id: `cr-${pilotId}-${kind}` as CurrencyRecordId,
    operatorId: OP,
    pilotId: pilotId as PilotId,
    kind,
    validFrom: offsetIso(-300),
    validTo: offsetIso(days),
    createdAt: '2026-01-01T00:00:00.000Z' as IsoDateTime,
  };
}

describe('dedupeNotifications (per-band)', () => {
  it('keys an alert by pilot, kind and cascade band', () => {
    const [n] = computeDueNotifications({
      pilots: [pilot('p1')],
      currencyRecords: [record('p1', 'opc', 80)],
      asOf: ASOF,
    });
    // 80d → band 90; INFO.
    assert.equal(notificationDedupeKey(n!), 'p1|opc|90');
  });

  it('passes everything through when the ledger is empty', () => {
    const ns = computeDueNotifications({
      pilots: [pilot('p1')],
      currencyRecords: [record('p1', 'class1Medical', 5), record('p1', 'lpc', 80)],
      asOf: ASOF,
    });
    const res = dedupeNotifications(ns, new Set());
    assert.equal(res.fresh.length, ns.length);
    assert.equal(res.suppressedCount, 0);
    assert.deepEqual([...res.newKeys].sort(), ns.map(notificationDedupeKey).sort());
  });

  it('suppresses alerts whose band was already sent', () => {
    const ns = computeDueNotifications({
      pilots: [pilot('p1')],
      currencyRecords: [record('p1', 'class1Medical', 5), record('p1', 'lpc', 80)],
      asOf: ASOF,
    });
    const ledger = new Set([notificationDedupeKey(ns[0]!)]);
    const res = dedupeNotifications(ns, ledger);
    assert.equal(res.fresh.length, ns.length - 1);
    assert.equal(res.suppressedCount, 1);
    assert.ok(!res.fresh.some((n) => ledger.has(notificationDedupeKey(n))));
  });

  it('re-alerts once the item crosses into a narrower band', () => {
    // Sent at the 90-band (80d out)...
    const wide = computeDueNotifications({
      pilots: [pilot('p1')],
      currencyRecords: [record('p1', 'opc', 80)],
      asOf: ASOF,
    });
    const ledger = new Set(wide.map(notificationDedupeKey));
    assert.equal(dedupeNotifications(wide, ledger).fresh.length, 0);
    // ...later the same item is 25d out → band 30 → a fresh key fires.
    const narrow = computeDueNotifications({
      pilots: [pilot('p1')],
      currencyRecords: [record('p1', 'opc', 25)],
      asOf: ASOF,
    });
    const res = dedupeNotifications(narrow, ledger);
    assert.equal(res.fresh.length, 1);
    assert.equal(res.fresh[0]!.thresholdDays, 30);
  });

  it('collapses duplicate keys within a single batch', () => {
    const n = computeDueNotifications({
      pilots: [pilot('p1')],
      currencyRecords: [record('p1', 'opc', 80)],
      asOf: ASOF,
    });
    const dup: ExpiryNotification[] = [...n, ...n];
    const res = dedupeNotifications(dup, new Set());
    assert.equal(res.fresh.length, 1);
    assert.equal(res.suppressedCount, 1);
    assert.equal(res.newKeys.length, 1);
  });
});

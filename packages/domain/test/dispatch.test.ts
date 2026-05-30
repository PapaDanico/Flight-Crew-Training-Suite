import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeDueNotifications,
  planNotificationDispatch,
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

describe('planNotificationDispatch (dry-run)', () => {
  it('returns an empty plan for no notifications', () => {
    const plan = planNotificationDispatch([]);
    assert.equal(plan.dryRun, true);
    assert.equal(plan.messages.length, 0);
    assert.equal(plan.recipientCount, 0);
    assert.deepEqual(plan.byChannel, { EMAIL: 0, SMS: 0, TELEGRAM: 0 });
  });

  it('digests a pilot’s items into one message per channel of their top severity', () => {
    const ns = computeDueNotifications({
      pilots: [pilot('p1')],
      currencyRecords: [record('p1', 'class1Medical', 5), record('p1', 'lpc', 80)],
      asOf: ASOF,
    });
    const plan = planNotificationDispatch(ns);
    // top severity = URGENT (medical 5d) → EMAIL+SMS+TELEGRAM = 3 messages, 1 recipient.
    assert.equal(plan.recipientCount, 1);
    assert.equal(plan.messages.length, 3);
    assert.deepEqual(plan.byChannel, { EMAIL: 1, SMS: 1, TELEGRAM: 1 });
    const m = plan.messages[0]!;
    assert.equal(m.severity, 'URGENT');
    assert.match(m.subject, /2 currency items need attention/);
    assert.equal(m.lines.length, 2);
    assert.match(m.lines[0]!, /Class 1 Medical — 5d \(URGENT\)/);
  });

  it('counts recipients and channels across pilots', () => {
    const ns: ExpiryNotification[] = computeDueNotifications({
      pilots: [pilot('p1'), pilot('p2')],
      currencyRecords: [record('p1', 'opc', 80), record('p2', 'class1Medical', -2)],
      asOf: ASOF,
    });
    const plan = planNotificationDispatch(ns);
    assert.equal(plan.recipientCount, 2);
    // p1 INFO → EMAIL only (1); p2 EXPIRED → 3. Total 4 messages.
    assert.equal(plan.messages.length, 4);
    assert.deepEqual(plan.byChannel, { EMAIL: 2, SMS: 1, TELEGRAM: 1 });
  });
});

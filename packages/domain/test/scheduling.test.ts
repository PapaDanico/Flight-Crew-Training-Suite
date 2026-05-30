import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeTrainingDueEvents,
  groupTrainingDueByUrgency,
  isSchedulableKind,
} from '../src/scheduling.js';
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

function pilot(overrides: Partial<Pilot> = {}): Pilot {
  return {
    id: 'p-1' as PilotId,
    operatorId: OP,
    fleetId: 'f-1' as FleetId,
    fullName: 'Capt. Test One',
    licenceNumber: 'KCAA/DEMO/ATPL/9001',
    role: 'Captain',
    baseIcao: 'HKJK',
    phase: 'Line',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z' as IsoDateTime,
    updatedAt: '2026-01-01T00:00:00.000Z' as IsoDateTime,
    ...overrides,
  };
}

function record(
  kind: CurrencyRecord['kind'],
  validToDays: number,
  pilotId = 'p-1',
): CurrencyRecord {
  return {
    id: `cr-${kind}-${pilotId}` as CurrencyRecordId,
    operatorId: OP,
    pilotId: pilotId as PilotId,
    kind,
    validFrom: offsetIso(-300),
    validTo: offsetIso(validToDays),
    createdAt: '2026-01-01T00:00:00.000Z' as IsoDateTime,
  };
}

describe('computeTrainingDueEvents', () => {
  it('emits nothing when all schedulable currencies are comfortably current', () => {
    const events = computeTrainingDueEvents({
      pilots: [pilot()],
      currencyRecords: [record('opc', 200), record('class1Medical', 250)],
      asOf: ASOF,
    });
    assert.equal(events.length, 0);
  });

  it('maps EXPIRED→OVERDUE, ACTION→BOOK_NOW, CAUTION→PLAN', () => {
    const events = computeTrainingDueEvents({
      pilots: [pilot()],
      currencyRecords: [
        record('class1Medical', -5), // expired
        record('opc', 20), // action (≤30)
        record('lpc', 60), // caution (31–90)
      ],
      asOf: ASOF,
    });
    const byKind = new Map(events.map((e) => [e.kind, e]));
    assert.equal(byKind.get('class1Medical')?.urgency, 'OVERDUE');
    assert.equal(byKind.get('opc')?.urgency, 'BOOK_NOW');
    assert.equal(byKind.get('lpc')?.urgency, 'PLAN');
  });

  it('flags OPC/LPC as requiring a sim slot, others not', () => {
    const events = computeTrainingDueEvents({
      pilots: [pilot()],
      currencyRecords: [record('opc', 20), record('crmTem', 20)],
      asOf: ASOF,
    });
    assert.equal(events.find((e) => e.kind === 'opc')?.requiresSimSlot, true);
    assert.equal(events.find((e) => e.kind === 'crmTem')?.requiresSimSlot, false);
  });

  it('computes book-by date as expiry minus the kind lead time, and flags overdue bookings', () => {
    // OPC lead = 45 days. Expiry in 20 days ⇒ book-by was 25 days ago ⇒ overdue.
    const [e] = computeTrainingDueEvents({
      pilots: [pilot()],
      currencyRecords: [record('opc', 20)],
      asOf: ASOF,
    });
    assert.ok(e);
    assert.equal(e.bookByDate, offsetIso(20 - 45));
    assert.equal(e.bookingOverdue, true);
  });

  it('respects the horizon (default 90 days)', () => {
    const events = computeTrainingDueEvents({
      pilots: [pilot()],
      currencyRecords: [record('lpc', 120)], // beyond 90-day horizon
      asOf: ASOF,
    });
    assert.equal(events.length, 0);
  });

  it('excludes NOT_APPLICABLE items (OPC for an ITR pilot)', () => {
    const events = computeTrainingDueEvents({
      pilots: [pilot({ phase: 'ITR_FFS' })],
      // no OPC record; ITR pilots are N/A for OPC, so nothing should surface
      currencyRecords: [],
      asOf: ASOF,
    });
    assert.equal(events.filter((e) => e.kind === 'opc').length, 0);
  });

  it('ignores inactive pilots and superseded records', () => {
    const supers: CurrencyRecord = {
      ...record('opc', 20),
      supersededAt: '2026-02-01T00:00:00.000Z' as IsoDateTime,
    };
    const inactiveEvents = computeTrainingDueEvents({
      pilots: [pilot({ active: false })],
      currencyRecords: [record('opc', 20)],
      asOf: ASOF,
    });
    assert.equal(inactiveEvents.length, 0, 'inactive pilot must produce no events');

    const supersededEvents = computeTrainingDueEvents({
      pilots: [pilot()],
      currencyRecords: [supers],
      asOf: ASOF,
    });
    assert.equal(supersededEvents.length, 0, 'superseded record must be ignored');
  });

  it('sorts most-urgent (soonest/most-overdue) first', () => {
    const events = computeTrainingDueEvents({
      pilots: [pilot()],
      currencyRecords: [record('lpc', 60), record('opc', 10), record('class1Medical', -3)],
      asOf: ASOF,
    });
    const days = events.map((e) => e.daysToExpiry);
    const sorted = [...days].sort((a, b) => a - b);
    assert.deepEqual(days, sorted);
    assert.equal(events[0]?.kind, 'class1Medical'); // -3 is most urgent
  });
});

describe('groupTrainingDueByUrgency', () => {
  it('buckets events into OVERDUE / BOOK_NOW / PLAN', () => {
    const events = computeTrainingDueEvents({
      pilots: [pilot()],
      currencyRecords: [record('class1Medical', -5), record('opc', 20), record('lpc', 60)],
      asOf: ASOF,
    });
    const g = groupTrainingDueByUrgency(events);
    assert.equal(g.OVERDUE.length, 1);
    assert.equal(g.BOOK_NOW.length, 1);
    assert.equal(g.PLAN.length, 1);
  });
});

describe('isSchedulableKind', () => {
  it('includes bookable kinds and excludes personal documents', () => {
    assert.equal(isSchedulableKind('opc'), true);
    assert.equal(isSchedulableKind('class1Medical'), true);
    assert.equal(isSchedulableKind('passportVisa'), false);
    assert.equal(isSchedulableKind('elpLevel'), false);
  });
});

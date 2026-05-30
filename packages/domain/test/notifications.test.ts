import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeDueNotifications } from '../src/notifications.js';
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

function record(kind: CurrencyRecord['kind'], validToDays: number): CurrencyRecord {
  return {
    id: `cr-${kind}` as CurrencyRecordId,
    operatorId: OP,
    pilotId: 'p-1' as PilotId,
    kind,
    validFrom: offsetIso(-300),
    validTo: offsetIso(validToDays),
    createdAt: '2026-01-01T00:00:00.000Z' as IsoDateTime,
  };
}

describe('computeDueNotifications', () => {
  it('emits nothing for comfortably-current currencies (>90d)', () => {
    const n = computeDueNotifications({
      pilots: [pilot()],
      currencyRecords: [record('class1Medical', 200)],
      asOf: ASOF,
    });
    assert.equal(n.length, 0);
  });

  it('maps the cascade bands and severities', () => {
    const n = computeDueNotifications({
      pilots: [pilot()],
      currencyRecords: [
        record('class1Medical', 80), // 60<d<=90 → threshold 90, INFO
        record('opc', 25), // 14<d<=30 → threshold 30, WARN
        record('lpc', 10), // d<=14 → threshold 14, URGENT
        record('lineCheck', -3), // expired → threshold 0, EXPIRED
      ],
      asOf: ASOF,
    });
    const by = new Map(n.map((e) => [e.kind, e]));
    assert.deepEqual(
      [by.get('class1Medical')?.thresholdDays, by.get('class1Medical')?.severity],
      [90, 'INFO'],
    );
    assert.deepEqual([by.get('opc')?.thresholdDays, by.get('opc')?.severity], [30, 'WARN']);
    assert.deepEqual([by.get('lpc')?.thresholdDays, by.get('lpc')?.severity], [14, 'URGENT']);
    assert.deepEqual(
      [by.get('lineCheck')?.thresholdDays, by.get('lineCheck')?.severity],
      [0, 'EXPIRED'],
    );
  });

  it('escalates channels with severity', () => {
    const [info] = computeDueNotifications({
      pilots: [pilot()],
      currencyRecords: [record('class1Medical', 80)],
      asOf: ASOF,
    });
    const [urgent] = computeDueNotifications({
      pilots: [pilot()],
      currencyRecords: [record('class1Medical', 5)],
      asOf: ASOF,
    });
    assert.deepEqual(info?.channels, ['EMAIL']);
    assert.deepEqual(urgent?.channels, ['EMAIL', 'SMS', 'TELEGRAM']);
  });

  it('excludes NOT_APPLICABLE items (OPC for an ITR pilot) and inactive pilots', () => {
    const itr = computeDueNotifications({
      pilots: [pilot({ phase: 'ITR_FFS' })],
      currencyRecords: [],
      asOf: ASOF,
    });
    assert.equal(itr.filter((e) => e.kind === 'opc').length, 0);

    const inactive = computeDueNotifications({
      pilots: [pilot({ active: false })],
      currencyRecords: [record('opc', 10)],
      asOf: ASOF,
    });
    assert.equal(inactive.length, 0);
  });

  it('sorts most-urgent first', () => {
    const n = computeDueNotifications({
      pilots: [pilot()],
      currencyRecords: [record('lpc', 60), record('opc', 5), record('class1Medical', -2)],
      asOf: ASOF,
    });
    assert.deepEqual(
      n.map((e) => e.daysToExpiry),
      [...n.map((e) => e.daysToExpiry)].sort((a, b) => a - b),
    );
    assert.equal(n[0]?.kind, 'class1Medical');
  });
});

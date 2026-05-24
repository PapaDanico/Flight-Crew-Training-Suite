import type {
  CurrencyRecordId,
  FleetId,
  IsoDate,
  IsoDateTime,
  OperatorId,
  PilotId,
} from './branded.js';
import type { Fleet } from './aircraft.js';
import { DEFAULT_OPERATOR_CONFIG, type Operator } from './operator.js';
import type { Pilot, TrainingPhase } from './pilot.js';
import { CURRENCY_CATALOG } from './currency-catalog.js';
import { mayBeNotApplicable, type CurrencyKind, type CurrencyRecord } from './currency.js';

/**
 * Deterministic, type-only demo fixtures for development screens and tests.
 *
 * Two operators (JAK Demo, I-Fly Demo) and four pilots using the
 * Capt. Alpha One / F/O Bravo Two pattern prescribed by CLAUDE.md
 * §"Things to avoid" ("Don't store real pilot data in test or demo
 * environments").
 *
 * Currency records are emitted per pilot only for kinds that are NOT
 * eligible to be N/A in the pilot's phase. Pilots in ITR therefore have
 * NO records for type-rating-derivative kinds, and the UI renders those
 * as NOT_APPLICABLE through statusFor() — closing Phase-0 audit §2.2.
 *
 * All dates are computed relative to an `asOf` argument so the demo is
 * reproducible in tests.
 */

const ISO_DATE = (d: Date): IsoDate => d.toISOString().slice(0, 10) as IsoDate;
const ISO_DATETIME = (d: Date): IsoDateTime => d.toISOString() as IsoDateTime;

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

const OP_JAK = '11111111-1111-1111-1111-111111111111' as OperatorId;
const OP_IFLY = '22222222-2222-2222-2222-222222222222' as OperatorId;

const FLEET_JAK_F70 = '11111111-aaaa-aaaa-aaaa-000000000001' as FleetId;
const FLEET_JAK_F70_HGW = '11111111-aaaa-aaaa-aaaa-000000000002' as FleetId;
const FLEET_IFLY_F100 = '22222222-aaaa-aaaa-aaaa-000000000001' as FleetId;

const P_ALPHA = '11111111-bbbb-bbbb-bbbb-000000000001' as PilotId;
const P_BRAVO = '11111111-bbbb-bbbb-bbbb-000000000002' as PilotId;
const P_CHARLIE = '22222222-bbbb-bbbb-bbbb-000000000001' as PilotId;
const P_DELTA = '22222222-bbbb-bbbb-bbbb-000000000002' as PilotId;

export const DEMO_OPERATORS: ReadonlyArray<Operator> = [
  {
    id: OP_JAK,
    legalName: 'Jubba Airways Kenya (Demo)',
    tradingName: 'JAK Demo',
    shortCode: 'JAK-DEMO',
    aocNumber: 'KE-AOC-DEMO-001',
    countryIso2: 'KE',
    accountableManagerName: 'Capt. Demo AM (JAK)',
    accountableManagerEmail: 'am-demo@jak.example',
    status: 'active',
    config: DEFAULT_OPERATOR_CONFIG(),
    createdAt: ISO_DATETIME(new Date('2026-01-01T00:00:00Z')),
    updatedAt: ISO_DATETIME(new Date('2026-01-01T00:00:00Z')),
  },
  {
    id: OP_IFLY,
    legalName: 'I-Fly Air Solutions (Demo)',
    tradingName: 'I-Fly Demo',
    shortCode: 'IFLY-DEMO',
    aocNumber: 'KE-AOC-DEMO-002',
    countryIso2: 'KE',
    accountableManagerName: 'Capt. Demo AM (I-Fly)',
    accountableManagerEmail: 'am-demo@ifly.example',
    status: 'active',
    config: DEFAULT_OPERATOR_CONFIG(),
    createdAt: ISO_DATETIME(new Date('2026-01-01T00:00:00Z')),
    updatedAt: ISO_DATETIME(new Date('2026-01-01T00:00:00Z')),
  },
];

export const DEMO_FLEETS: ReadonlyArray<Fleet> = [
  {
    id: FLEET_JAK_F70,
    operatorId: OP_JAK,
    variant: 'F70',
    displayName: 'JAK F70 Fleet',
    active: true,
  },
  {
    id: FLEET_JAK_F70_HGW,
    operatorId: OP_JAK,
    variant: 'F70-HGW',
    displayName: 'JAK F70 HGW (5Y-MMB)',
    active: true,
  },
  {
    id: FLEET_IFLY_F100,
    operatorId: OP_IFLY,
    variant: 'F100',
    displayName: 'I-Fly F100 Fleet',
    active: true,
  },
];

interface DemoPilotSpec {
  pilot: Pilot;
  /**
   * Currency offsets — days from asOf to validTo, per CurrencyKind. Omitted
   * kinds emit no record (the page will render NOT_APPLICABLE if eligible,
   * EXPIRED otherwise).
   */
  currencyOffsets: Partial<
    Record<CurrencyKind, { validFromDaysAgo: number; validToDaysAhead: number }>
  >;
}

function pilotSpec(
  pilot: Pick<
    Pilot,
    'id' | 'operatorId' | 'fleetId' | 'fullName' | 'licenceNumber' | 'role' | 'baseIcao' | 'phase'
  >,
  overrides: DemoPilotSpec['currencyOffsets'] = {},
): DemoPilotSpec {
  const allCurrent: Partial<
    Record<CurrencyKind, { validFromDaysAgo: number; validToDaysAhead: number }>
  > = {};
  for (const c of CURRENCY_CATALOG) {
    if (mayBeNotApplicable(c.kind, pilot.phase)) continue;
    allCurrent[c.kind] = { validFromDaysAgo: 180, validToDaysAhead: 200 };
  }
  return {
    pilot: {
      ...pilot,
      active: true,
      createdAt: ISO_DATETIME(new Date('2026-01-01T00:00:00Z')),
      updatedAt: ISO_DATETIME(new Date('2026-01-01T00:00:00Z')),
    },
    currencyOffsets: { ...allCurrent, ...overrides },
  };
}

const DEMO_PILOT_SPECS: ReadonlyArray<DemoPilotSpec> = [
  pilotSpec({
    id: P_ALPHA,
    operatorId: OP_JAK,
    fleetId: FLEET_JAK_F70_HGW,
    fullName: 'Capt. Alpha One',
    licenceNumber: 'KCAA/DEMO/ATPL/0001',
    role: 'Captain',
    baseIcao: 'HKJK',
    phase: 'Line',
  }),
  pilotSpec(
    {
      id: P_BRAVO,
      operatorId: OP_JAK,
      fleetId: FLEET_JAK_F70,
      fullName: 'F/O Bravo Two',
      licenceNumber: 'KCAA/DEMO/CPL/0002',
      role: 'First Officer',
      baseIcao: 'HKJK',
      phase: 'Line',
    },
    {
      opc: { validFromDaysAgo: 165, validToDaysAhead: 15 },
      crmTem: { validFromDaysAgo: 300, validToDaysAhead: 60 },
    },
  ),
  pilotSpec(
    {
      id: P_CHARLIE,
      operatorId: OP_IFLY,
      fleetId: FLEET_IFLY_F100,
      fullName: 'Capt. Charlie Three',
      licenceNumber: 'KCAA/DEMO/ATPL/0003',
      role: 'Captain',
      baseIcao: 'HKEL',
      phase: 'RecurrentDue',
    },
    {
      class1Medical: { validFromDaysAgo: 366, validToDaysAhead: -1 },
      opc: { validFromDaysAgo: 200, validToDaysAhead: -5 },
      lineCheck: { validFromDaysAgo: 120, validToDaysAhead: 80 },
    },
  ),
  pilotSpec({
    id: P_DELTA,
    operatorId: OP_IFLY,
    fleetId: FLEET_IFLY_F100,
    fullName: 'F/O Delta Four',
    licenceNumber: 'KCAA/DEMO/CPL/0004',
    role: 'First Officer',
    baseIcao: 'HKML',
    phase: 'ITR_FFS',
  }),
];

export const DEMO_PILOTS: ReadonlyArray<Pilot> = DEMO_PILOT_SPECS.map((s) => s.pilot);

/**
 * Build a deterministic set of CurrencyRecord rows relative to an `asOf`
 * timestamp. Default is the current wall clock so demos look "live"; tests
 * pass an explicit date for reproducibility.
 */
export function buildDemoCurrencyRecords(asOf: Date = new Date()): ReadonlyArray<CurrencyRecord> {
  const records: CurrencyRecord[] = [];
  for (const spec of DEMO_PILOT_SPECS) {
    let serial = 1;
    for (const [kind, offsets] of Object.entries(spec.currencyOffsets) as Array<
      [CurrencyKind, { validFromDaysAgo: number; validToDaysAhead: number }]
    >) {
      const id =
        `demo-cr-${spec.pilot.id.slice(-12)}-${serial.toString().padStart(2, '0')}` as CurrencyRecordId;
      records.push({
        id,
        operatorId: spec.pilot.operatorId,
        pilotId: spec.pilot.id,
        kind,
        validFrom: ISO_DATE(addDays(asOf, -offsets.validFromDaysAgo)),
        validTo: ISO_DATE(addDays(asOf, offsets.validToDaysAhead)),
        createdAt: ISO_DATETIME(addDays(asOf, -offsets.validFromDaysAgo)),
      });
      serial += 1;
    }
  }
  return records;
}

/**
 * Index helper for UI rendering: pilotId × kind → latest CurrencyRecord.
 */
export function indexCurrencyByPilotAndKind(
  records: ReadonlyArray<CurrencyRecord>,
): ReadonlyMap<string, CurrencyRecord> {
  const m = new Map<string, CurrencyRecord>();
  for (const r of records) {
    if (r.supersededAt !== undefined) continue;
    m.set(`${r.pilotId}|${r.kind}`, r);
  }
  return m;
}

export function currencyMapKey(pilotId: PilotId, kind: CurrencyKind): string {
  return `${pilotId}|${kind}`;
}

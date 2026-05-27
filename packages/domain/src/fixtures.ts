import type {
  CurrencyRecordId,
  ExerciseId,
  FleetId,
  IsoDate,
  IsoDateTime,
  OperatorId,
  PilotId,
  SessionId,
  SignOffId,
  UserId,
} from './branded.js';
import type { Fleet } from './aircraft.js';
import { DEFAULT_OPERATOR_CONFIG, type Operator } from './operator.js';
import type { Pilot, TrainingPhase } from './pilot.js';
import { CURRENCY_CATALOG } from './currency-catalog.js';
import { mayBeNotApplicable, type CurrencyKind, type CurrencyRecord } from './currency.js';
import { ICAO_COMPETENCY, type Grade, type IcaoCompetency } from './competency.js';
import type {
  CompetencyGrade,
  DebriefNote,
  Exercise,
  Session,
  SessionKind,
  SessionVenue,
  SignOff,
} from './training.js';

/**
 * Deterministic, type-only demo fixtures for development screens and tests.
 *
 * Demo operator → aircraft type mapping:
 *   - I-Fly Air Solutions = F70/100 production-ready demo (4 pilots, rich
 *     session content; the polished primary calibration)
 *   - Jubba Airways Kenya = B737NG type-extensibility preview demo (2 pilots,
 *     no session content yet — illustrates that AI prompts / KCAA exports
 *     refuse to fabricate aviation facts until a B737-qualified TRI/TRE
 *     populates the operational profile per ADR 0006)
 *
 * Pilots follow the Capt. Alpha One / F/O Bravo Two pattern prescribed by
 * CLAUDE.md §"Things to avoid" ("Don't store real pilot data in test or demo
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

// JAK's demo deployment is B737NG (preview profile). I-Fly's demo
// deployment carries the F70/100 production-ready calibration with three
// variants. Fleet UUIDs retain a stable prefix per operator.
const FLEET_JAK_B737 = '11111111-aaaa-aaaa-aaaa-000000000001' as FleetId;
const FLEET_IFLY_F70 = '22222222-aaaa-aaaa-aaaa-000000000001' as FleetId;
const FLEET_IFLY_F70_HGW = '22222222-aaaa-aaaa-aaaa-000000000002' as FleetId;
const FLEET_IFLY_F100 = '22222222-aaaa-aaaa-aaaa-000000000003' as FleetId;

// F70/100 production-demo pilots (I-Fly)
const P_ALPHA = '22222222-bbbb-bbbb-bbbb-000000000001' as PilotId;
const P_BRAVO = '22222222-bbbb-bbbb-bbbb-000000000002' as PilotId;
const P_CHARLIE = '22222222-bbbb-bbbb-bbbb-000000000003' as PilotId;
const P_DELTA = '22222222-bbbb-bbbb-bbbb-000000000004' as PilotId;
// B737NG preview-demo pilots (JAK) — no session fixtures: the preview
// profile carries pendingPrimarySource on operational + AI content, so we
// refuse to fabricate B737-specific exercises until a qualified TRI/TRE
// populates the profile.
const P_ECHO = '11111111-bbbb-bbbb-bbbb-000000000001' as PilotId;
const P_FOXTROT = '11111111-bbbb-bbbb-bbbb-000000000002' as PilotId;

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
    id: FLEET_JAK_B737,
    operatorId: OP_JAK,
    variant: 'B737',
    displayName: 'JAK B737NG Fleet (preview)',
    active: true,
  },
  {
    id: FLEET_IFLY_F70,
    operatorId: OP_IFLY,
    variant: 'F70',
    displayName: 'I-Fly F70 Fleet',
    active: true,
  },
  {
    id: FLEET_IFLY_F70_HGW,
    operatorId: OP_IFLY,
    variant: 'F70-HGW',
    displayName: 'I-Fly F70 HGW Fleet',
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
  // ---- I-Fly: F70/100 production-ready demo --------------------------------
  pilotSpec({
    id: P_ALPHA,
    operatorId: OP_IFLY,
    fleetId: FLEET_IFLY_F70_HGW,
    fullName: 'Capt. Alpha One',
    licenceNumber: 'KCAA/DEMO/ATPL/0001',
    role: 'Captain',
    baseIcao: 'HKJK',
    phase: 'Line',
  }),
  pilotSpec(
    {
      id: P_BRAVO,
      operatorId: OP_IFLY,
      fleetId: FLEET_IFLY_F70,
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
  // ---- JAK: B737NG type-extensibility preview demo -------------------------
  pilotSpec({
    id: P_ECHO,
    operatorId: OP_JAK,
    fleetId: FLEET_JAK_B737,
    fullName: 'Capt. Echo Five',
    licenceNumber: 'KCAA/DEMO/ATPL/0005',
    role: 'Captain',
    baseIcao: 'HKJK',
    phase: 'Line',
  }),
  pilotSpec({
    id: P_FOXTROT,
    operatorId: OP_JAK,
    fleetId: FLEET_JAK_B737,
    fullName: 'F/O Foxtrot Six',
    licenceNumber: 'KCAA/DEMO/CPL/0006',
    role: 'First Officer',
    baseIcao: 'HKJK',
    phase: 'Line',
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

// ----------------------------------------------------------------------------
// Training session fixtures
//
// Demonstrates Session / Exercise / CompetencyGrade / SignOff / DebriefNote
// composing per ICAO Doc 9868 PANS-TRG: every exercise grades all 8 ICAO
// competencies, with NOT_OBSERVED used where a competency is genuinely not
// observable in a given exercise. This is the data shape required to replace
// the prototype's regex-based single-competency mapping (Phase-0 audit §4.1 /
// CLAUDE.md §"CBTA competency grading").
// ----------------------------------------------------------------------------

const INSTRUCTOR_TRE = '11111111-cccc-cccc-cccc-000000000001' as UserId;
const INSTRUCTOR_LCE = '22222222-cccc-cccc-cccc-000000000001' as UserId;

/** Short aliases for grade values; produces compact, readable seed lines. */
const AS: Grade = { scale: 'AS-S-MS-BS', value: 'AS' };
const S: Grade = { scale: 'AS-S-MS-BS', value: 'S' };
const MS: Grade = { scale: 'AS-S-MS-BS', value: 'MS' };
const BS: Grade = { scale: 'AS-S-MS-BS', value: 'BS' };
const NO = (reason: string): Grade => ({ scale: 'NOT_OBSERVED', reason });

/**
 * Build a CompetencyGrade tuple in ICAO_COMPETENCY order:
 * 1. APPLICATION_OF_PROCEDURES
 * 2. COMMUNICATION
 * 3. FLIGHT_PATH_AUTOMATION
 * 4. FLIGHT_PATH_MANUAL
 * 5. LEADERSHIP_TEAMWORK
 * 6. PROBLEM_SOLVING_DECISION_MAKING
 * 7. SITUATION_AWARENESS
 * 8. WORKLOAD_MANAGEMENT
 */
function competencies(
  ...vs: [Grade, Grade, Grade, Grade, Grade, Grade, Grade, Grade]
): ReadonlyArray<CompetencyGrade> {
  return ICAO_COMPETENCY.map((competency, i) => ({ competency, grade: vs[i]! }));
}

interface ExerciseSpec {
  title: string;
  reference: string;
  observableBehaviours?: ReadonlyArray<string>;
  debriefNote?: string;
  grades: ReadonlyArray<CompetencyGrade>;
}

interface SessionSpec {
  sessionId: SessionId;
  operatorId: OperatorId;
  pilotId: PilotId;
  pairedPilotId?: PilotId;
  kind: SessionKind;
  venue: SessionVenue;
  ffsDesignation?: string;
  instructorUserId: UserId;
  startedDaysAgo: number;
  durationHours: number;
  status: 'DRAFT' | 'COMPLETED' | 'SIGNED_OFF';
  overallGrade?: Grade;
  signOffRole?: 'TRI' | 'TRE' | 'LCE' | 'LTC' | 'HOT';
  signOffStatement?: string;
  debriefAuthor?: UserId;
  debriefBody?: string;
  exercises: ReadonlyArray<ExerciseSpec>;
}

const DEMO_SESSION_SPECS: ReadonlyArray<SessionSpec> = [
  {
    sessionId: '22222222-dddd-dddd-dddd-000000000003' as SessionId,
    operatorId: OP_IFLY,
    pilotId: P_ALPHA,
    kind: 'LINE_CHECK',
    venue: 'AIRCRAFT',
    instructorUserId: INSTRUCTOR_LCE,
    startedDaysAgo: 14,
    durationHours: 2,
    status: 'SIGNED_OFF',
    overallGrade: S,
    signOffRole: 'LCE',
    signOffStatement:
      'Annual Line Check completed in accordance with the I-Fly Operations Manual and KCARs 2025 ' +
      'requirements. Captain met all required standards across the sector.',
    debriefAuthor: INSTRUCTOR_LCE,
    debriefBody:
      'Strong situational awareness throughout. Departure brief was thorough — threats clearly ' +
      'enumerated and mitigated. Cross-cockpit communication exemplary. No findings.',
    exercises: [
      {
        title: 'Sector Departure — HKJK 06',
        reference: 'OM-B §8.3 Departure procedures',
        observableBehaviours: [
          'Threat brief covered weather, NOTAMs, and high-ground SID profile',
          'Standard callouts on the takeoff roll consistent with SOP',
        ],
        grades: competencies(S, S, S, AS, S, S, AS, S),
      },
      {
        title: 'Cruise — fuel monitoring and FMC discipline',
        reference: 'OM-B §9 Cruise procedures',
        observableBehaviours: [
          'Planned vs actual fuel cross-checked at each TOC and waypoint',
          'Mode awareness maintained through ATC re-routing',
        ],
        grades: competencies(S, AS, AS, S, S, S, S, S),
      },
      {
        title: 'Approach & Landing — HKJK 24 ILS',
        reference: 'OM-B §10 Approach procedures',
        observableBehaviours: [
          'Stabilised by 1,000 ft AAL IMC per operator OpSpec',
          'VMA-based approach speeds called and flown',
        ],
        grades: competencies(S, S, S, S, S, S, S, S),
      },
    ],
  },
  {
    sessionId: '22222222-dddd-dddd-dddd-000000000004' as SessionId,
    operatorId: OP_IFLY,
    pilotId: P_BRAVO,
    kind: 'OPC',
    venue: 'FFS',
    ffsDesignation: 'SimAero Dinard FR-101',
    instructorUserId: INSTRUCTOR_TRE,
    startedDaysAgo: 8,
    durationHours: 4,
    status: 'SIGNED_OFF',
    overallGrade: MS,
    signOffRole: 'TRE',
    signOffStatement:
      'OPC conducted at SimAero Dinard FR-101 (EASA Level C). Candidate met minimum standard ' +
      'with reinforcement required on EICAS interpretation. Remedial briefing completed before ' +
      'sign-off; next OPC due 6 months from this date.',
    debriefAuthor: INSTRUCTOR_TRE,
    debriefBody:
      'Engine failure on takeoff handled correctly: PPAA with 5° bank into the live engine, ' +
      'V2 -> V2+10 maintained. EICAS scan was slow on the hydraulic dual-failure scenario; ' +
      'this is the remedial focus. T-DODAR application improving but verbalisation needs work.',
    exercises: [
      {
        title: 'Rejected Takeoff (below V1)',
        reference: 'QRH ABNORMAL-RTO',
        observableBehaviours: [
          'PF callout "STOP, MY CONTROL" within 1 second of caution',
          'Max braking + idle thrust + speedbrake + reverse',
        ],
        grades: competencies(AS, AS, S, AS, AS, S, S, S),
      },
      {
        title: 'Engine Failure on Takeoff (above V1)',
        reference: 'QRH ENG-FIRE',
        observableBehaviours: [
          'PPAA technique applied with 5° bank into live engine',
          'V2 maintained until acceleration altitude',
        ],
        grades: competencies(S, S, S, AS, S, AS, S, S),
      },
      {
        title: 'Hydraulic Dual System Failure (Sys 1 + Sys 2)',
        reference: 'QRH HYD-DUAL',
        observableBehaviours: [
          'Identified loss of both systems via EICAS — slower than target time',
          'QRH actions completed; manual reversion accepted',
        ],
        debriefNote:
          'EICAS scan rate is the remediation focus. Recommend ground-school review of HYD ' +
          'system architecture (Yr1 triennial matrix).',
        grades: competencies(MS, S, S, S, S, MS, MS, MS),
      },
      {
        title: 'Rapid Decompression / Emergency Descent',
        reference: 'QRH PRESS-RAPID',
        observableBehaviours: [
          'Oxygen masks 100% donned as memory item',
          'Emergency descent profile maintained',
          'PA to cabin within 30 seconds',
        ],
        grades: competencies(S, S, S, S, MS, S, S, MS),
      },
    ],
  },
  {
    sessionId: '22222222-dddd-dddd-dddd-000000000001' as SessionId,
    operatorId: OP_IFLY,
    pilotId: P_CHARLIE,
    kind: 'OPC',
    venue: 'FFS',
    ffsDesignation: 'SimAero Dinard FR-101',
    instructorUserId: INSTRUCTOR_TRE,
    startedDaysAgo: 2,
    durationHours: 4,
    status: 'DRAFT',
    exercises: [
      {
        title: 'Windshear on Approach (PWS alert)',
        reference: 'QRH WSHEAR-RECOV',
        observableBehaviours: [
          'TOGA + pitch toward stick shaker',
          'Speedbrake retracted; configuration unchanged',
        ],
        grades: competencies(S, S, AS, S, S, AS, S, S),
      },
      {
        title: 'TCAS Resolution Advisory',
        reference: 'QRH TCAS-RA',
        observableBehaviours: ['RA followed promptly; AP disconnected', 'PM advised ATC "TCAS RA"'],
        grades: competencies(S, AS, S, S, S, S, AS, S),
      },
    ],
  },
  {
    sessionId: '22222222-dddd-dddd-dddd-000000000002' as SessionId,
    operatorId: OP_IFLY,
    pilotId: P_DELTA,
    kind: 'ITR_FFS',
    venue: 'FFS',
    ffsDesignation: 'SimAero Dinard FR-101',
    instructorUserId: INSTRUCTOR_TRE,
    startedDaysAgo: 5,
    durationHours: 4,
    status: 'SIGNED_OFF',
    overallGrade: S,
    signOffRole: 'TRI',
    signOffStatement:
      'FFS Session 9 (Progress Check) completed. Candidate demonstrates readiness for the ' +
      'KCAA Skills Test. Note: FFS 9 is a Progress Check only — Skills Test is a separate ' +
      'KCAA-administered session that precedes Base Training on the actual aircraft per ' +
      'ICAO Doc 9868 §4.5.1 (ZFTT not available at Level C).',
    debriefAuthor: INSTRUCTOR_TRE,
    debriefBody:
      'Candidate handles single failures crisply. Workload management still has headroom — ' +
      'recommend deliberate "out-loud" prioritisation during high-task-rate sequences. ' +
      'CRM/TEM behaviours strong. Ready for Skills Test.',
    exercises: [
      {
        title: 'Normal Takeoff — Flaps 0 (default)',
        reference: 'OM-B Takeoff Flap Policy',
        observableBehaviours: [
          'EICAS configuration confirmed before takeoff roll',
          'TOCWS limitation discussed and understood (no alert for Flaps 0)',
        ],
        grades: competencies(S, S, S, S, NO('single-pilot sim segment'), S, S, S),
      },
      {
        title: 'Engine-Out Go-Around (OEI)',
        reference: 'QRH GA-OEI',
        observableBehaviours: [
          'PPAA technique applied',
          '5° bank into live engine maintained throughout',
        ],
        grades: competencies(S, S, S, S, S, S, S, MS),
      },
      {
        title: 'Cat II ILS Approach to Landing',
        reference: 'OM-B Cat II Procedures',
        observableBehaviours: [
          'Approach briefing complete with autoland criteria',
          'Crew callouts at DH per SOP',
        ],
        grades: competencies(S, S, AS, S, S, S, S, S),
      },
      {
        title: 'Smoke / Fire / Fumes (Galley)',
        reference: 'QRH SMOKE-FUMES',
        observableBehaviours: [
          'Memory items: O2 100%, smoke goggles, crew comms re-established',
          'Land at nearest suitable decision verbalised',
        ],
        grades: competencies(S, AS, S, S, S, AS, S, S),
      },
      {
        title: 'Diversion — fuel and weather decision',
        reference: 'OM-A Decision Framework T-DODAR',
        observableBehaviours: [
          'T-DODAR applied: Time available diagnosed, options enumerated',
          'Decision rationale verbalised; FO concur cycle completed',
        ],
        debriefNote:
          'Decision quality strong. Workload management note: more deliberate task allocation ' +
          'to PM during high-rate phase would improve further.',
        grades: competencies(AS, AS, S, S, S, AS, AS, MS),
      },
    ],
  },
];

const DEMO_INSTRUCTORS: ReadonlyMap<UserId, string> = new Map([
  [INSTRUCTOR_TRE, 'Capt. Demo TRE'],
  [INSTRUCTOR_LCE, 'Capt. Demo LCE'],
]);

export function lookupInstructorName(userId: UserId): string {
  return DEMO_INSTRUCTORS.get(userId) ?? 'Unknown Instructor';
}

export interface DemoSessions {
  sessions: ReadonlyArray<Session>;
  exercises: ReadonlyArray<Exercise>;
  competencyGrades: ReadonlyArray<{
    exerciseId: ExerciseId;
    grades: ReadonlyArray<CompetencyGrade>;
  }>;
  signOffs: ReadonlyArray<SignOff>;
  debriefNotes: ReadonlyArray<DebriefNote>;
}

export function buildDemoSessions(asOf: Date = new Date()): DemoSessions {
  const sessions: Session[] = [];
  const exercises: Exercise[] = [];
  const competencyGrades: Array<{
    exerciseId: ExerciseId;
    grades: ReadonlyArray<CompetencyGrade>;
  }> = [];
  const signOffs: SignOff[] = [];
  const debriefNotes: DebriefNote[] = [];

  for (const spec of DEMO_SESSION_SPECS) {
    const startedAt = ISO_DATETIME(addDays(asOf, -spec.startedDaysAgo));
    const endedAtDate = new Date(addDays(asOf, -spec.startedDaysAgo));
    endedAtDate.setUTCHours(endedAtDate.getUTCHours() + spec.durationHours);
    const endedAt = ISO_DATETIME(endedAtDate);

    const session: Session = {
      id: spec.sessionId,
      operatorId: spec.operatorId,
      pilotId: spec.pilotId,
      kind: spec.kind,
      venue: spec.venue,
      startedAt,
      endedAt,
      ...(spec.ffsDesignation !== undefined ? { ffsDesignation: spec.ffsDesignation } : {}),
      instructorUserId: spec.instructorUserId,
      ...(spec.pairedPilotId !== undefined ? { pairedPilotId: spec.pairedPilotId } : {}),
      ...(spec.overallGrade !== undefined ? { overallGrade: spec.overallGrade } : {}),
      status: spec.status,
      createdAt: startedAt,
      updatedAt: endedAt,
    };
    sessions.push(session);

    spec.exercises.forEach((ex, idx) => {
      const exerciseId =
        `${spec.sessionId}-ex-${(idx + 1).toString().padStart(2, '0')}` as ExerciseId;
      const exercise: Exercise = {
        id: exerciseId,
        sessionId: spec.sessionId,
        ordinal: idx + 1,
        title: ex.title,
        reference: ex.reference,
        ...(ex.observableBehaviours !== undefined
          ? { observableBehaviours: ex.observableBehaviours }
          : {}),
        competencyGrades: ex.grades,
        ...(ex.debriefNote !== undefined ? { debriefNote: ex.debriefNote } : {}),
        createdAt: startedAt,
      };
      exercises.push(exercise);
      competencyGrades.push({ exerciseId, grades: ex.grades });
    });

    if (
      spec.status === 'SIGNED_OFF' &&
      spec.signOffRole !== undefined &&
      spec.signOffStatement !== undefined
    ) {
      const signOff: SignOff = {
        id: `${spec.sessionId}-signoff` as SignOffId,
        sessionId: spec.sessionId,
        operatorId: spec.operatorId,
        signedByUserId: spec.instructorUserId,
        signedByRole: spec.signOffRole,
        signedAt: endedAt,
        statement: spec.signOffStatement,
      };
      signOffs.push(signOff);
    }

    if (spec.debriefAuthor !== undefined && spec.debriefBody !== undefined) {
      debriefNotes.push({
        sessionId: spec.sessionId,
        authoredByUserId: spec.debriefAuthor,
        body: spec.debriefBody,
        createdAt: endedAt,
      });
    }
  }

  return { sessions, exercises, competencyGrades, signOffs, debriefNotes };
}

/**
 * Tally grade values per competency across a set of exercises. Used by the
 * session-detail UI to render an aggregate view. Counts {AS, S, MS, BS,
 * NOT_OBSERVED} per competency.
 */
export type CompetencyTally = Readonly<
  Record<IcaoCompetency, { AS: number; S: number; MS: number; BS: number; NOT_OBSERVED: number }>
>;

export function tallyCompetencies(exercises: ReadonlyArray<Exercise>): CompetencyTally {
  const tally = {} as {
    [k in IcaoCompetency]: { AS: number; S: number; MS: number; BS: number; NOT_OBSERVED: number };
  };
  for (const c of ICAO_COMPETENCY) {
    tally[c] = { AS: 0, S: 0, MS: 0, BS: 0, NOT_OBSERVED: 0 };
  }
  for (const ex of exercises) {
    for (const cg of ex.competencyGrades) {
      if (cg.grade.scale === 'NOT_OBSERVED') {
        tally[cg.competency].NOT_OBSERVED += 1;
      } else if (cg.grade.scale === 'AS-S-MS-BS') {
        tally[cg.competency][cg.grade.value] += 1;
      }
      // ICAO-1-5 scale is not exercised by the demo fixtures; ignored here.
    }
  }
  return tally;
}

// ----------------------------------------------------------------------------
// OM Cross-Reference Mapping fixtures (per-operator, Third-Schedule -> OM)
//
// Maps an LN 42/2026 Third Schedule clause (or §2.2 training topic) to the
// operator's own Operations Manual section + evidence reference. This is the
// matrix the operator submits to KCAA per Reg 17(3) — the attestation that
// the OM addresses every binding clause.
//
// For the demo, I-Fly (F70/100 production demo) gets two rich mappings; JAK
// (B737NG preview demo) gets a single lightweight CRM mapping reflecting an
// early-Phase-1 deployment. All other clauses render "Not yet mapped
// (Phase 1 deliverable)" on the page.
// ----------------------------------------------------------------------------

export interface OmCrossReferenceMapping {
  readonly operatorId: OperatorId;
  /** Third Schedule clause short reference, e.g. '§2.1.25' or '§2.2.4'. */
  readonly clauseShortRef: string;
  /** Operator's OM section reference, e.g. 'OM-A §8.4.3'. */
  readonly operatorOmSection: string;
  /** Evidence pointer, e.g. 'AOM rev 12, p. 247' or a URL. */
  readonly evidenceReference?: string;
  readonly mappedByUserName?: string;
  readonly mappedAt?: IsoDateTime;
  readonly notes?: string;
}

export const DEMO_OM_MAPPINGS: ReadonlyArray<OmCrossReferenceMapping> = [
  {
    operatorId: OP_IFLY,
    clauseShortRef: '§2.1.25',
    operatorOmSection: 'OM-A §8.4.3',
    evidenceReference: 'I-Fly OM-A rev 12, p. 247 (Stabilised Approach Policy)',
    mappedByUserName: 'Capt. Demo HoT (I-Fly)',
    mappedAt: ISO_DATETIME(new Date('2026-04-15T10:00:00Z')),
    notes:
      'I-Fly gates: stabilised by 1,000 ft AAL IMC / 500 ft AAL VMC. Go-around mandatory ' +
      'below gate if non-stabilised.',
  },
  {
    operatorId: OP_IFLY,
    clauseShortRef: '§2.2.4',
    operatorOmSection: 'OM-D §3.1 — CRM Recurrent Programme',
    evidenceReference: 'I-Fly CRM Programme rev 3 (annual cycle, 6 hrs)',
    mappedByUserName: 'Capt. Demo HoT (I-Fly)',
    mappedAt: ISO_DATETIME(new Date('2026-04-18T10:00:00Z')),
  },
  {
    operatorId: OP_JAK,
    clauseShortRef: '§2.2.4',
    operatorOmSection: 'OM-D §4 — CRM/TEM',
    evidenceReference: 'JAK Training Manual rev 2',
    mappedByUserName: 'Capt. Demo HoT (JAK)',
    mappedAt: ISO_DATETIME(new Date('2026-04-20T10:00:00Z')),
  },
];

export function buildOmMappingIndex(
  mappings: ReadonlyArray<OmCrossReferenceMapping>,
  operatorId: OperatorId,
): ReadonlyMap<string, OmCrossReferenceMapping> {
  const m = new Map<string, OmCrossReferenceMapping>();
  for (const r of mappings) {
    if (r.operatorId !== operatorId) continue;
    m.set(r.clauseShortRef, r);
  }
  return m;
}

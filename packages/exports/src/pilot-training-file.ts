import {
  CURRENCY_CATALOG,
  CURRENCY_CATEGORY,
  COMPETENCY_LABEL,
  ICAO_COMPETENCY,
  currencyMapKey,
  indexCurrencyByPilotAndKind,
  lookupCurrency,
  lookupInstructorName,
  statusFor,
  tallyCompetencies,
  type CompetencyTally,
  type CurrencyCategory,
  type CurrencyRecord,
  type CurrencyStatus,
  type DebriefNote,
  type Exercise,
  type Grade,
  type IcaoCompetency,
  type IsoDate,
  type Operator,
  type Pilot,
  type Session,
  type SignOff,
} from '@dnca/domain';

/**
 * Pilot Training File — per-pilot, complete-history attestation.
 *
 * The fourth-and-final KCAA-aligned export the Phase-0 audit named. An
 * inspector handed this file can reconstruct the pilot's full training
 * record: currency, every session ever logged, every per-exercise CBTA
 * competency grade, every sign-off, every debrief.
 *
 * Per CLAUDE.md §"Exports": "Default to PDF for inspector-facing exports."
 * Renderer is HTML + print stylesheet → Cmd-P → Save as PDF; pdf-lib /
 * puppeteer for programmatic PDF is a future addition once email
 * automation enters scope.
 */

export interface PilotTrainingFileInput {
  operator: Operator;
  pilot: Pilot;
  currencyRecords: ReadonlyArray<CurrencyRecord>;
  sessions: ReadonlyArray<Session>;
  exercises: ReadonlyArray<Exercise>;
  signOffs: ReadonlyArray<SignOff>;
  debriefNotes: ReadonlyArray<DebriefNote>;
  asOf: IsoDate;
  generatedAt: Date;
  generatedByUserName?: string;
}

export interface PtfCurrencyRow {
  kind: string;
  label: string;
  primarySource: string;
  validFrom: IsoDate | null;
  validTo: IsoDate | null;
  status: CurrencyStatus;
}

export interface PtfCategoryBlock {
  category: CurrencyCategory;
  rows: ReadonlyArray<PtfCurrencyRow>;
}

export interface PtfSessionBlock {
  session: Session;
  exercises: ReadonlyArray<Exercise>;
  signOff: SignOff | null;
  debriefNote: DebriefNote | null;
}

export interface PilotTrainingFileData {
  operator: Operator;
  pilot: Pilot;
  asOf: IsoDate;
  generatedAt: Date;
  generatedByUserName: string | null;
  documentTitle: string;

  currencyByCategory: ReadonlyArray<PtfCategoryBlock>;
  currencyStatusCounts: Record<CurrencyStatus, number>;

  sessions: ReadonlyArray<PtfSessionBlock>;
  signedOffSessionCount: number;
  draftSessionCount: number;

  /**
   * 8-competency aggregate across every exercise this pilot has been graded
   * on. Drives the "competency profile" panel on the printed file — the
   * cluster-pattern view that tells an HoT which competency to focus on
   * next recurrent.
   */
  competencyAggregate: CompetencyTally;
  totalExercisesGraded: number;
}

export function buildPilotTrainingFile(input: PilotTrainingFileInput): PilotTrainingFileData {
  const recordIndex = indexCurrencyByPilotAndKind(
    input.currencyRecords.filter((r) => r.pilotId === input.pilot.id),
  );

  const currencyStatusCounts: Record<CurrencyStatus, number> = {
    CURRENT: 0,
    CAUTION: 0,
    ACTION: 0,
    EXPIRED: 0,
    NOT_APPLICABLE: 0,
  };

  const currencyByCategory: PtfCategoryBlock[] = CURRENCY_CATEGORY.map((category) => {
    const rows: PtfCurrencyRow[] = CURRENCY_CATALOG.filter((c) => c.category === category).map(
      (c) => {
        const rec = recordIndex.get(currencyMapKey(input.pilot.id, c.kind));
        const status = statusFor({
          kind: c.kind,
          phase: input.pilot.phase,
          validTo: rec?.validTo,
          asOf: input.asOf,
        });
        currencyStatusCounts[status] += 1;
        const entry = lookupCurrency(c.kind);
        return {
          kind: c.kind,
          label: entry.label,
          primarySource: entry.primarySource,
          validFrom: rec?.validFrom ?? null,
          validTo: rec?.validTo ?? null,
          status,
        };
      },
    );
    return { category, rows };
  });

  // Per-pilot sessions, newest first.
  const pilotSessions = input.sessions
    .filter((s) => s.pilotId === input.pilot.id)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));

  const sessionBlocks: PtfSessionBlock[] = pilotSessions.map((session) => {
    const sessionExercises = input.exercises
      .filter((e) => e.sessionId === session.id)
      .sort((a, b) => a.ordinal - b.ordinal);
    const signOff = input.signOffs.find((so) => so.sessionId === session.id) ?? null;
    const debriefNote = input.debriefNotes.find((d) => d.sessionId === session.id) ?? null;
    return { session, exercises: sessionExercises, signOff, debriefNote };
  });

  // 8-competency aggregate across every exercise this pilot has been
  // graded on. tallyCompetencies takes an array of exercises and sums
  // grade counts per competency.
  const allPilotExercises = sessionBlocks.flatMap((s) => s.exercises);
  const competencyAggregate = tallyCompetencies(allPilotExercises);

  const signedOffSessionCount = sessionBlocks.filter(
    (s) => s.session.status === 'SIGNED_OFF',
  ).length;
  const draftSessionCount = sessionBlocks.filter((s) => s.session.status === 'DRAFT').length;

  return {
    operator: input.operator,
    pilot: input.pilot,
    asOf: input.asOf,
    generatedAt: input.generatedAt,
    generatedByUserName: input.generatedByUserName ?? null,
    documentTitle: `Pilot Training File — ${input.pilot.fullName}`,
    currencyByCategory,
    currencyStatusCounts,
    sessions: sessionBlocks,
    signedOffSessionCount,
    draftSessionCount,
    competencyAggregate,
    totalExercisesGraded: allPilotExercises.length,
  };
}

export function pilotTrainingFileFilenameStem(pilot: Pilot, asOf: IsoDate): string {
  const safe = pilot.licenceNumber.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return `pilot-training-file_${safe}_${asOf}`;
}

/**
 * Re-export the 8 ICAO competencies + label map + Grade type so the
 * apps/web print page doesn't have to import from two places.
 */
export { COMPETENCY_LABEL, ICAO_COMPETENCY };
export type { CompetencyTally, IcaoCompetency, Grade };

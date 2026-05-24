import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { Grade } from '@dnca/domain';
import { aircraft } from './aircraft.js';
import {
  gradeScaleEnum,
  icaoCompetencyEnum,
  sessionKindEnum,
  sessionStatusEnum,
  sessionVenueEnum,
  signOffRoleEnum,
} from './enums.js';
import { operators } from './operator.js';
import { pilots } from './pilot.js';

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    operatorId: uuid('operator_id')
      .notNull()
      .references(() => operators.id, { onDelete: 'restrict' }),
    pilotId: uuid('pilot_id')
      .notNull()
      .references(() => pilots.id, { onDelete: 'restrict' }),
    kind: sessionKindEnum('kind').notNull(),
    venue: sessionVenueEnum('venue').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    aircraftId: uuid('aircraft_id').references(() => aircraft.id, { onDelete: 'set null' }),
    ffsDesignation: text('ffs_designation'),
    instructorUserId: uuid('instructor_user_id').notNull(),
    pairedPilotId: uuid('paired_pilot_id').references(() => pilots.id, { onDelete: 'set null' }),
    overallGradeScale: gradeScaleEnum('overall_grade_scale'),
    overallGradeValue: text('overall_grade_value'),
    status: sessionStatusEnum('status').notNull().default('DRAFT'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pilotIdx: index('sessions_pilot_idx').on(t.pilotId),
    operatorIdx: index('sessions_operator_idx').on(t.operatorId),
    startedAtIdx: index('sessions_started_at_idx').on(t.startedAt),
  }),
);

export const exercises = pgTable(
  'exercises',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    operatorId: uuid('operator_id')
      .notNull()
      .references(() => operators.id, { onDelete: 'restrict' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    ordinal: integer('ordinal').notNull(),
    title: text('title').notNull(),
    reference: text('reference').notNull(),
    observableBehaviours: jsonb('observable_behaviours').$type<readonly string[]>(),
    debriefNote: text('debrief_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sessionOrdinalUx: uniqueIndex('exercises_session_ordinal_ux').on(t.sessionId, t.ordinal),
    operatorIdx: index('exercises_operator_idx').on(t.operatorId),
  }),
);

/**
 * Per-exercise, per-competency grade. Each exercise produces one row per ICAO
 * competency. This is the data model required to replace the prototype's
 * single-competency regex heuristic — see CLAUDE.md §"CBTA competency grading".
 */
export const competencyGrades = pgTable(
  'competency_grades',
  {
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    operatorId: uuid('operator_id')
      .notNull()
      .references(() => operators.id, { onDelete: 'restrict' }),
    competency: icaoCompetencyEnum('competency').notNull(),
    scale: gradeScaleEnum('scale').notNull(),
    value: text('value'),
    notObservedReason: text('not_observed_reason'),
  },
  (t) => ({
    pk: uniqueIndex('competency_grades_pk').on(t.exerciseId, t.competency),
    operatorIdx: index('competency_grades_operator_idx').on(t.operatorId),
  }),
);

export const signOffs = pgTable('sign_offs', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'restrict' }),
  operatorId: uuid('operator_id')
    .notNull()
    .references(() => operators.id, { onDelete: 'restrict' }),
  signedByUserId: uuid('signed_by_user_id').notNull(),
  signedByRole: signOffRoleEnum('signed_by_role').notNull(),
  signedAt: timestamp('signed_at', { withTimezone: true }).notNull().defaultNow(),
  statement: text('statement').notNull(),
});

export const debriefNotes = pgTable('debrief_notes', {
  sessionId: uuid('session_id')
    .primaryKey()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  operatorId: uuid('operator_id')
    .notNull()
    .references(() => operators.id, { onDelete: 'restrict' }),
  authoredByUserId: uuid('authored_by_user_id').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const assessmentResults = pgTable(
  'assessment_results',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    operatorId: uuid('operator_id')
      .notNull()
      .references(() => operators.id, { onDelete: 'restrict' }),
    pilotId: uuid('pilot_id')
      .notNull()
      .references(() => pilots.id, { onDelete: 'restrict' }),
    topic: text('topic').notNull(),
    questionsCount: integer('questions_count').notNull(),
    correctCount: integer('correct_count').notNull(),
    scorePercent: integer('score_percent').notNull(),
    passed: boolean('passed').notNull(),
    passMarkPercent: integer('pass_mark_percent').notNull().default(80),
    modelId: text('model_id').notNull(),
    promptVersion: text('prompt_version').notNull(),
    responseJsonHash: text('response_json_hash').notNull(),
    takenAt: timestamp('taken_at', { withTimezone: true }).notNull().defaultNow(),
    proctoredByUserId: uuid('proctored_by_user_id'),
  },
  (t) => ({
    pilotIdx: index('assessment_results_pilot_idx').on(t.pilotId),
    operatorIdx: index('assessment_results_operator_idx').on(t.operatorId),
  }),
);

export type SessionRow = typeof sessions.$inferSelect;
export type ExerciseRow = typeof exercises.$inferSelect;
export type CompetencyGradeRow = typeof competencyGrades.$inferSelect;
export type SignOffRow = typeof signOffs.$inferSelect;
export type AssessmentResultRow = typeof assessmentResults.$inferSelect;

/**
 * Helper for callers that hold a domain Grade and need the (scale, value) pair
 * to store on sessions / competency_grades.
 */
export function gradeToColumns(g: Grade): {
  scale: string;
  value: string | null;
  notObservedReason: string | null;
} {
  if (g.scale === 'NOT_OBSERVED') {
    return { scale: 'NOT_OBSERVED', value: null, notObservedReason: g.reason };
  }
  return { scale: g.scale, value: String(g.value), notObservedReason: null };
}

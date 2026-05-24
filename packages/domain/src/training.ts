import type {
  AircraftId,
  AssessmentResultId,
  ExerciseId,
  IsoDateTime,
  OperatorId,
  PilotId,
  SessionId,
  SignOffId,
  UserId,
} from './branded.js';
import type { Grade, IcaoCompetency } from './competency.js';

export const SESSION_KIND = [
  'ITR_GROUND',
  'ITR_FBT',
  'ITR_FFS',
  'SKILLS_TEST',
  'BASE_TRAINING',
  'LIFUS',
  'LINE_CHECK',
  'OPC',
  'LPC',
  'CRM_RECURRENT',
  'SEP_RECURRENT',
  'GROUND_RECURRENT',
] as const;
export type SessionKind = (typeof SESSION_KIND)[number];

export const SESSION_VENUE = ['FFS', 'FBT', 'CLASSROOM', 'AIRCRAFT', 'ONLINE'] as const;
export type SessionVenue = (typeof SESSION_VENUE)[number];

export interface Session {
  id: SessionId;
  operatorId: OperatorId;
  pilotId: PilotId;
  kind: SessionKind;
  venue: SessionVenue;
  startedAt: IsoDateTime;
  endedAt?: IsoDateTime;
  aircraftId?: AircraftId;
  ffsDesignation?: string;
  instructorUserId: UserId;
  pairedPilotId?: PilotId;
  overallGrade?: Grade;
  status: 'DRAFT' | 'COMPLETED' | 'SIGNED_OFF' | 'VOIDED';
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Exercise {
  id: ExerciseId;
  sessionId: SessionId;
  ordinal: number;
  title: string;
  reference: string;
  observableBehaviours?: readonly string[];
  competencyGrades: ReadonlyArray<CompetencyGrade>;
  debriefNote?: string;
  createdAt: IsoDateTime;
}

/**
 * Per-exercise, per-competency grade — the unit of CBTA grading per ICAO Doc 9868.
 * An exercise grades ALL EIGHT competencies; a competency may be NOT_OBSERVED for a
 * given exercise where genuinely not observable.
 */
export interface CompetencyGrade {
  competency: IcaoCompetency;
  grade: Grade;
}

export interface SignOff {
  id: SignOffId;
  sessionId: SessionId;
  operatorId: OperatorId;
  signedByUserId: UserId;
  signedByRole: 'TRI' | 'TRE' | 'LCE' | 'LTC' | 'HOT';
  signedAt: IsoDateTime;
  statement: string;
}

export interface DebriefNote {
  sessionId: SessionId;
  authoredByUserId: UserId;
  body: string;
  createdAt: IsoDateTime;
}

export interface AssessmentResult {
  id: AssessmentResultId;
  operatorId: OperatorId;
  pilotId: PilotId;
  topic: string;
  questionsCount: number;
  correctCount: number;
  scorePercent: number;
  passed: boolean;
  passMarkPercent: 80;
  modelId: string;
  promptVersion: string;
  responseJsonHash: string;
  takenAt: IsoDateTime;
  proctoredByUserId?: UserId;
}

import type { FleetId, IsoDate, IsoDateTime, OperatorId, PilotId } from './branded.js';

export const PILOT_ROLE = ['Captain', 'First Officer'] as const;
export type PilotRole = (typeof PILOT_ROLE)[number];

/**
 * Operator-defined training phase. The platform requires that medical and ATPL/CPL
 * be CURRENT regardless of phase — only type-rating-derivative currencies may be
 * NOT_APPLICABLE during ITR. See CLAUDE.md §"Currency calculations" and the
 * Phase-0 audit §2.2.
 */
export const TRAINING_PHASE = [
  'ITR_Ground',
  'ITR_FBT',
  'ITR_FFS',
  'SkillsTest',
  'BaseTraining',
  'LIFUS',
  'Line',
  'RecurrentDue',
  'Suspended',
] as const;
export type TrainingPhase = (typeof TRAINING_PHASE)[number];

export const ITR_PHASES: ReadonlySet<TrainingPhase> = new Set(['ITR_Ground', 'ITR_FBT', 'ITR_FFS']);

export function isInTraining(phase: TrainingPhase): boolean {
  return ITR_PHASES.has(phase);
}

export interface Pilot {
  id: PilotId;
  operatorId: OperatorId;
  fleetId: FleetId;
  fullName: string;
  licenceNumber: string;
  role: PilotRole;
  baseIcao: string;
  phase: TrainingPhase;
  employeeId?: string;
  hireDate?: IsoDate;
  dateOfBirth?: IsoDate;
  totalHours?: number;
  typeHours?: number;
  picHours?: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  active: boolean;
  deletedAt?: IsoDateTime;
  deletionReason?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

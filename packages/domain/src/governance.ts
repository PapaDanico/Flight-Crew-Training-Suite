import type { AuditEventId, IsoDateTime, OperatorId, UserId } from './branded.js';

export const ROLE = [
  'ACCOUNTABLE_MANAGER',
  'HEAD_OF_TRAINING',
  'CHIEF_PILOT',
  'SAFETY_MANAGER',
  'QUALITY_MANAGER',
  'TRI',
  'TRE',
  'LCE',
  'LTC',
  'PILOT',
  'PLATFORM_ADMIN',
] as const;
export type Role = (typeof ROLE)[number];

export interface User {
  id: UserId;
  email: string;
  fullName: string;
  active: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/**
 * A User may hold one or more roles per Operator (instructors who serve multiple
 * operators carry distinct role rows). PLATFORM_ADMIN is the only role permitted
 * to operate across tenants.
 */
export interface RoleAssignment {
  userId: UserId;
  operatorId: OperatorId | null;
  role: Role;
  grantedByUserId: UserId;
  grantedAt: IsoDateTime;
  revokedAt?: IsoDateTime;
}

export const AUDIT_ACTION = [
  'CREATE',
  'UPDATE',
  'SOFT_DELETE',
  'HARD_DELETE',
  'SIGN_OFF',
  'EXPORT',
  'ASSESSMENT_GENERATED',
  'KCAA_SUBMISSION_LOCKED',
  'KCAA_SUBMISSION_APPROVED',
  'KCAA_SUBMISSION_REJECTED',
  'AUTH_LOGIN',
  'AUTH_LOGIN_FAILED',
  'AUTH_LOGOUT',
  'AUTH_PASSWORD_RESET',
  'ROLE_GRANTED',
  'ROLE_REVOKED',
] as const;
export type AuditAction = (typeof AUDIT_ACTION)[number];

/**
 * Append-only event store. Rows are immutable: Postgres triggers reject UPDATE
 * and DELETE on this table. KCAA inspectors must be able to reconstruct the full
 * history of any record from these events. See ADR 0003.
 */
export interface AuditEvent {
  id: AuditEventId;
  operatorId: OperatorId | null;
  actorUserId: UserId | null;
  actorRole: Role | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
  beforeState: unknown;
  afterState: unknown;
  occurredAt: IsoDateTime;
  requestId: string;
  ipAddress: string;
  userAgent?: string;
}

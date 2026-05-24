import type { AuditAction, Role } from '@dnca/domain';
import { auditEvents, type AuditEventInsert } from './schema/governance.js';
import type { Database } from './client.js';

/**
 * Audit-event emission context. Every mutating route obtains this from the
 * request handler — operator scope, actor identity, request id, and source IP.
 * Forgetting to emit an event is caught at integration-test time per ADR 0003.
 */
export interface AuditContext {
  operatorId: string | null;
  actorUserId: string | null;
  actorRole: Role | null;
  requestId: string;
  ipAddress: string;
  userAgent?: string;
}

export interface AuditPayload {
  entityType: string;
  entityId: string;
  action: AuditAction;
  beforeState: unknown;
  afterState: unknown;
}

export async function emitAuditEvent(
  db: Database,
  ctx: AuditContext,
  payload: AuditPayload,
): Promise<void> {
  const row: AuditEventInsert = {
    operatorId: ctx.operatorId,
    actorUserId: ctx.actorUserId,
    actorRole: ctx.actorRole,
    entityType: payload.entityType,
    entityId: payload.entityId,
    action: payload.action,
    beforeState: payload.beforeState,
    afterState: payload.afterState,
    requestId: ctx.requestId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent ?? null,
  };
  await db.insert(auditEvents).values(row);
}

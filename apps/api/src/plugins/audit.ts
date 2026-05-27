import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { emitAuditEvent, type AuditContext, type Database } from '@dnca/db';
import type { AuditAction } from '@dnca/domain';

/**
 * Audit event emission. Per ADR 0003, every state-changing operation
 * MUST emit an AuditEvent. This plugin exposes a typed helper that
 * routes call from inside their transaction.
 *
 * Routes that fail to call emitAuditEvent for a mutating action will be
 * caught at integration-test time (Sprint 2 — assertion against every
 * mutating handler). This plugin doesn't enforce it at runtime to avoid
 * the false-negative case (a route legitimately not mutating state).
 */
export const auditPlugin: FastifyPluginAsync = async (app) => {
  app.decorateRequest('auditContext', null as unknown as AuditContext);

  app.addHook('onRequest', async (request) => {
    const ua = request.headers['user-agent'];
    const ctx: AuditContext = {
      operatorId: request.principal?.operatorId ?? null,
      actorUserId: request.principal?.userId ?? null,
      actorRole: request.principal?.roles?.[0] ?? null,
      requestId: request.id,
      ipAddress: request.ip,
      ...(typeof ua === 'string' ? { userAgent: ua } : {}),
    };
    request.auditContext = ctx;
  });

  app.decorate(
    'emitAuditEvent',
    async function (
      db: Database,
      request: FastifyRequest,
      payload: {
        entityType: string;
        entityId: string;
        action: AuditAction;
        beforeState: unknown;
        afterState: unknown;
      },
    ) {
      return emitAuditEvent(db, request.auditContext, payload);
    },
  );
};

declare module 'fastify' {
  interface FastifyInstance {
    emitAuditEvent: (
      db: Database,
      request: FastifyRequest,
      payload: {
        entityType: string;
        entityId: string;
        action: AuditAction;
        beforeState: unknown;
        afterState: unknown;
      },
    ) => Promise<void>;
  }
  interface FastifyRequest {
    auditContext: AuditContext;
  }
}

export default fp(auditPlugin, { name: 'audit', dependencies: ['auth'] });

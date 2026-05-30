import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pilots } from '@dnca/db';
import { PILOT_ROLE, TRAINING_PHASE } from '@dnca/domain';
import { and, eq, isNull } from 'drizzle-orm';
import type { ZodTypeProvider } from '../plugins/zod-validator.js';
import { requireRoleGroup } from '../lib/rbac.js';

/**
 * Pilot routes. Establishes the per-route transaction pattern that
 * every mutating route in the platform follows:
 *
 *   1. Auth gate sets request.principal
 *   2. operatorId is taken from the principal (NOT from request body)
 *   3. Mutation runs inside withOperatorScope() — Postgres SET LOCAL
 *      app.operator_id activates RLS for this transaction
 *   4. AuditEvent emitted in the SAME transaction (so a successful
 *      mutation always has a corresponding audit row, and a rolled-back
 *      mutation rolls back its audit row too — they're atomic)
 *
 * Sprint 2: pilot CRUD only. Currency / session / document mutations
 * follow the same shape across Sprint 3.
 */

const PilotResponse = z.object({
  id: z.string().uuid(),
  operatorId: z.string().uuid(),
  fleetId: z.string().uuid(),
  fullName: z.string(),
  licenceNumber: z.string(),
  role: z.enum(PILOT_ROLE),
  baseIcao: z.string(),
  phase: z.enum(TRAINING_PHASE),
  active: z.boolean(),
});

const CreatePilotBody = z.object({
  fleetId: z.string().uuid(),
  fullName: z.string().min(1).max(120),
  licenceNumber: z.string().min(1).max(64),
  role: z.enum(PILOT_ROLE),
  baseIcao: z.string().length(4),
  phase: z.enum(TRAINING_PHASE),
});

const UpdatePilotBody = z.object({
  fullName: z.string().min(1).max(120).optional(),
  baseIcao: z.string().length(4).optional(),
  phase: z.enum(TRAINING_PHASE).optional(),
  fleetId: z.string().uuid().optional(),
});

const DeletePilotBody = z.object({
  reason: z.string().min(8).max(500),
});

const PilotParams = z.object({ id: z.string().uuid() });

export const pilotRoutes: FastifyPluginAsync = async (rawApp) => {
  const app = rawApp.withTypeProvider<ZodTypeProvider>();

  // --- LIST ---
  app.get(
    '/pilots',
    {
      schema: {
        response: { 200: z.object({ pilots: z.array(PilotResponse), asOf: z.string() }) },
      },
    },
    async (request) => {
      const operatorId = requireOperatorScope(request);
      const rows = await app.withOperatorScope(operatorId, async (db) =>
        db
          .select()
          .from(pilots)
          .where(and(eq(pilots.active, true), isNull(pilots.deletedAt))),
      );
      return {
        pilots: rows.map(toPilotResponse),
        asOf: new Date().toISOString(),
      };
    },
  );

  // --- READ ---
  app.get(
    '/pilots/:id',
    { schema: { params: PilotParams, response: { 200: PilotResponse } } },
    async (request) => {
      const operatorId = requireOperatorScope(request);
      const { id } = request.params;
      const row = await app.withOperatorScope(operatorId, async (db) => {
        const [r] = await db.select().from(pilots).where(eq(pilots.id, id)).limit(1);
        return r;
      });
      if (!row) throw app.httpErrors.notFound(`Pilot ${id} not found`);
      return toPilotResponse(row);
    },
  );

  // --- CREATE ---
  app.post(
    '/pilots',
    {
      schema: { body: CreatePilotBody, response: { 201: PilotResponse } },
    },
    async (request, reply) => {
      const operatorId = requireOperatorScope(request);
      requireRoleGroup(request.principal, 'PILOT_WRITE');
      const body = request.body;

      const created = await app.withOperatorScope(operatorId, async (db) => {
        const [inserted] = await db
          .insert(pilots)
          .values({
            operatorId,
            fleetId: body.fleetId,
            fullName: body.fullName,
            licenceNumber: body.licenceNumber,
            role: body.role,
            baseIcao: body.baseIcao,
            phase: body.phase,
          })
          .returning();
        if (!inserted) throw app.httpErrors.internalServerError('Insert returned no row');

        await app.emitAuditEvent(db, request, {
          entityType: 'Pilot',
          entityId: inserted.id,
          action: 'CREATE',
          beforeState: null,
          afterState: inserted,
        });

        return inserted;
      });

      void reply.code(201);
      return toPilotResponse(created);
    },
  );

  // --- UPDATE ---
  app.patch(
    '/pilots/:id',
    { schema: { params: PilotParams, body: UpdatePilotBody, response: { 200: PilotResponse } } },
    async (request) => {
      const operatorId = requireOperatorScope(request);
      requireRoleGroup(request.principal, 'PILOT_WRITE');
      const { id } = request.params;
      const patch = request.body;

      const updated = await app.withOperatorScope(operatorId, async (db) => {
        const [before] = await db.select().from(pilots).where(eq(pilots.id, id)).limit(1);
        if (!before) throw app.httpErrors.notFound(`Pilot ${id} not found`);

        // Drop undefined keys so Drizzle's update() accepts a clean partial.
        const set: Record<string, unknown> = { updatedAt: new Date() };
        if (patch.fullName !== undefined) set.fullName = patch.fullName;
        if (patch.baseIcao !== undefined) set.baseIcao = patch.baseIcao;
        if (patch.phase !== undefined) set.phase = patch.phase;
        if (patch.fleetId !== undefined) set.fleetId = patch.fleetId;

        const [after] = await db.update(pilots).set(set).where(eq(pilots.id, id)).returning();
        if (!after) throw app.httpErrors.internalServerError('Update returned no row');

        await app.emitAuditEvent(db, request, {
          entityType: 'Pilot',
          entityId: id,
          action: 'UPDATE',
          beforeState: before,
          afterState: after,
        });

        return after;
      });

      return toPilotResponse(updated);
    },
  );

  // --- SOFT DELETE ---
  app.delete(
    '/pilots/:id',
    {
      schema: {
        params: PilotParams,
        body: DeletePilotBody,
        response: { 200: z.object({ ok: z.literal(true) }) },
      },
    },
    async (request) => {
      const operatorId = requireOperatorScope(request);
      requireRoleGroup(request.principal, 'PILOT_DELETE');
      const { id } = request.params;
      const { reason } = request.body;

      await app.withOperatorScope(operatorId, async (db) => {
        const [before] = await db.select().from(pilots).where(eq(pilots.id, id)).limit(1);
        if (!before) throw app.httpErrors.notFound(`Pilot ${id} not found`);

        const [after] = await db
          .update(pilots)
          .set({
            active: false,
            deletedAt: new Date(),
            deletionReason: reason,
          })
          .where(eq(pilots.id, id))
          .returning();

        await app.emitAuditEvent(db, request, {
          entityType: 'Pilot',
          entityId: id,
          action: 'SOFT_DELETE',
          beforeState: before,
          afterState: after,
        });
      });

      return { ok: true as const };
    },
  );
};

function requireOperatorScope(request: { principal: { operatorId: string | null } }): string {
  const operatorId = request.principal.operatorId;
  if (!operatorId) {
    const err = new Error('No operator scope on this principal');
    (err as Error & { statusCode: number }).statusCode = 403;
    throw err;
  }
  return operatorId;
}

function toPilotResponse(row: typeof pilots.$inferSelect): z.infer<typeof PilotResponse> {
  return {
    id: row.id,
    operatorId: row.operatorId,
    fleetId: row.fleetId,
    fullName: row.fullName,
    licenceNumber: row.licenceNumber,
    role: row.role,
    baseIcao: row.baseIcao,
    phase: row.phase,
    active: row.active,
  };
}

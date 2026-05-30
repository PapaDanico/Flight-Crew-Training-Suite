import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { currencyRecords, pilots, sessions } from '@dnca/db';
import { CURRENCY_KIND } from '@dnca/domain';
import { and, eq, isNull } from 'drizzle-orm';
import type { ZodTypeProvider } from '../plugins/zod-validator.js';
import { requireRoleGroup } from '../lib/rbac.js';

/**
 * Currency record routes. Implements regulated-records discipline:
 *
 *   - Records are immutable once issued. To "correct" or "renew" a
 *     currency, you issue a NEW record. The previous active record of
 *     the same kind for the same pilot is automatically marked
 *     superseded (supersededAt, supersededBy) inside the same
 *     transaction.
 *   - Both the new record (CREATE) and the supersession (UPDATE) emit
 *     AuditEvent rows atomically. A KCAA inspector can reconstruct
 *     every validity window the pilot has ever held by walking the
 *     supersededBy chain.
 *   - Soft-delete is not supported on currency records. To remove an
 *     erroneously-issued record, supersede it with a corrected one and
 *     reference the correction in the notes field.
 */

const CurrencyRecordResponse = z.object({
  id: z.string().uuid(),
  operatorId: z.string().uuid(),
  pilotId: z.string().uuid(),
  kind: z.enum(CURRENCY_KIND),
  validFrom: z.string(),
  validTo: z.string(),
  sourceSessionId: z.string().uuid().nullable(),
  issuedByUserId: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  supersededAt: z.string().nullable(),
  supersededBy: z.string().uuid().nullable(),
  createdAt: z.string(),
});

const IssueCurrencyBody = z.object({
  kind: z.enum(CURRENCY_KIND),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expect YYYY-MM-DD'),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expect YYYY-MM-DD'),
  sourceSessionId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

const PilotIdParams = z.object({ pilotId: z.string().uuid() });

export const currencyRoutes: FastifyPluginAsync = async (rawApp) => {
  const app = rawApp.withTypeProvider<ZodTypeProvider>();

  // --- LIST active currencies for a pilot ---
  app.get(
    '/pilots/:pilotId/currency-records',
    {
      schema: {
        params: PilotIdParams,
        response: { 200: z.object({ records: z.array(CurrencyRecordResponse) }) },
      },
    },
    async (request) => {
      const operatorId = requireOperatorScope(request);
      const { pilotId } = request.params;
      const rows = await app.withOperatorScope(operatorId, async (db) =>
        db
          .select()
          .from(currencyRecords)
          .where(and(eq(currencyRecords.pilotId, pilotId), isNull(currencyRecords.supersededAt))),
      );
      return { records: rows.map(toCurrencyResponse) };
    },
  );

  // --- ISSUE new currency record (with auto-supersession) ---
  app.post(
    '/pilots/:pilotId/currency-records',
    {
      schema: {
        params: PilotIdParams,
        body: IssueCurrencyBody,
        response: { 201: CurrencyRecordResponse },
      },
    },
    async (request, reply) => {
      const operatorId = requireOperatorScope(request);
      requireRoleGroup(request.principal, 'CURRENCY_ISSUE');
      const issuerUserId = request.principal.userId;
      const { pilotId } = request.params;
      const body = request.body;

      // Validity sanity check
      if (body.validTo < body.validFrom) {
        throw app.httpErrors.badRequest('validTo must be on or after validFrom');
      }

      const created = await app.withOperatorScope(operatorId, async (db) => {
        // 0. Verify the pilot is in THIS operator's tenant (the FK does not
        // honour RLS — see sessions.ts). RLS returns zero rows for a foreign id.
        const [pilot] = await db
          .select({ id: pilots.id })
          .from(pilots)
          .where(eq(pilots.id, pilotId))
          .limit(1);
        if (!pilot) throw app.httpErrors.notFound(`Pilot ${pilotId} not found`);

        // If a source session is referenced, it too must be in-tenant.
        if (body.sourceSessionId !== undefined) {
          const [srcSession] = await db
            .select({ id: sessions.id })
            .from(sessions)
            .where(eq(sessions.id, body.sourceSessionId))
            .limit(1);
          if (!srcSession) {
            throw app.httpErrors.notFound(`Source session ${body.sourceSessionId} not found`);
          }
        }

        // 1. Find the current active record for this (pilot, kind), if any.
        const [existing] = await db
          .select()
          .from(currencyRecords)
          .where(
            and(
              eq(currencyRecords.pilotId, pilotId),
              eq(currencyRecords.kind, body.kind),
              isNull(currencyRecords.supersededAt),
            ),
          )
          .limit(1);

        // 2. Insert the new record.
        const [inserted] = await db
          .insert(currencyRecords)
          .values({
            operatorId,
            pilotId,
            kind: body.kind,
            validFrom: body.validFrom,
            validTo: body.validTo,
            ...(body.sourceSessionId !== undefined
              ? { sourceSessionId: body.sourceSessionId }
              : {}),
            issuedByUserId: issuerUserId,
            ...(body.notes !== undefined ? { notes: body.notes } : {}),
          })
          .returning();
        if (!inserted) throw app.httpErrors.internalServerError('Insert returned no row');

        await app.emitAuditEvent(db, request, {
          entityType: 'CurrencyRecord',
          entityId: inserted.id,
          action: 'CREATE',
          beforeState: null,
          afterState: inserted,
        });

        // 3. Supersede the previous active record (if any), audit-logged.
        if (existing) {
          const [supersededRow] = await db
            .update(currencyRecords)
            .set({ supersededAt: new Date(), supersededBy: inserted.id })
            .where(eq(currencyRecords.id, existing.id))
            .returning();

          await app.emitAuditEvent(db, request, {
            entityType: 'CurrencyRecord',
            entityId: existing.id,
            action: 'UPDATE',
            beforeState: existing,
            afterState: supersededRow,
          });
        }

        return inserted;
      });

      void reply.code(201);
      return toCurrencyResponse(created);
    },
  );

  // --- READ one currency record ---
  app.get(
    '/pilots/:pilotId/currency-records/:id',
    {
      schema: {
        params: z.object({ pilotId: z.string().uuid(), id: z.string().uuid() }),
        response: { 200: CurrencyRecordResponse },
      },
    },
    async (request) => {
      const operatorId = requireOperatorScope(request);
      const { pilotId, id } = request.params;
      const row = await app.withOperatorScope(operatorId, async (db) => {
        const [r] = await db
          .select()
          .from(currencyRecords)
          .where(and(eq(currencyRecords.id, id), eq(currencyRecords.pilotId, pilotId)))
          .limit(1);
        return r;
      });
      if (!row) throw app.httpErrors.notFound(`CurrencyRecord ${id} not found`);
      return toCurrencyResponse(row);
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

function toCurrencyResponse(
  row: typeof currencyRecords.$inferSelect,
): z.infer<typeof CurrencyRecordResponse> {
  return {
    id: row.id,
    operatorId: row.operatorId,
    pilotId: row.pilotId,
    kind: row.kind,
    validFrom: row.validFrom,
    validTo: row.validTo,
    sourceSessionId: row.sourceSessionId ?? null,
    issuedByUserId: row.issuedByUserId ?? null,
    notes: row.notes ?? null,
    supersededAt: row.supersededAt ? row.supersededAt.toISOString() : null,
    supersededBy: row.supersededBy ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sessions, exercises, competencyGrades, signOffs, pilots } from '@dnca/db';
import { ICAO_COMPETENCY, SESSION_KIND, SESSION_VENUE } from '@dnca/domain';
import { and, eq } from 'drizzle-orm';
import type { ZodTypeProvider } from '../plugins/zod-validator.js';
import { requireRoleGroup } from '../lib/rbac.js';

/**
 * Session logging routes — the CBTA write path.
 *
 * State machine:
 *   DRAFT --[add exercises]--> DRAFT --[sign off]--> SIGNED_OFF (terminal)
 *
 * Discipline:
 *   - Exercises can only be added to DRAFT sessions
 *   - Sign-off is the terminal transition; once SIGNED_OFF a session is
 *     immutable except via supersession (a corrective draft session that
 *     references the original — Sprint 3+)
 *   - Each exercise grade-insert writes all 8 ICAO competencies atomically
 *     (ADR-aligned: real CBTA grades every competency per exercise)
 *   - All three endpoints emit AuditEvent in the same transaction
 */

const SessionResponse = z.object({
  id: z.string().uuid(),
  operatorId: z.string().uuid(),
  pilotId: z.string().uuid(),
  kind: z.enum(SESSION_KIND),
  venue: z.enum(SESSION_VENUE),
  ffsDesignation: z.string().nullable(),
  instructorUserId: z.string().uuid(),
  status: z.enum(['DRAFT', 'COMPLETED', 'SIGNED_OFF', 'VOIDED']),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
});

const CreateSessionBody = z.object({
  kind: z.enum(SESSION_KIND),
  venue: z.enum(SESSION_VENUE),
  ffsDesignation: z.string().max(120).optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
});

const GradeSchema = z.discriminatedUnion('scale', [
  z.object({
    scale: z.literal('AS-S-MS-BS'),
    value: z.enum(['AS', 'S', 'MS', 'BS']),
  }),
  z.object({
    scale: z.literal('ICAO-1-5'),
    value: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  }),
  z.object({ scale: z.literal('NOT_OBSERVED'), reason: z.string().min(1).max(200) }),
]);

const ExerciseInputBody = z.object({
  ordinal: z.number().int().min(1),
  title: z.string().min(1).max(200),
  reference: z.string().min(1).max(200),
  observableBehaviours: z.array(z.string().min(1).max(300)).max(20).optional(),
  debriefNote: z.string().max(2000).optional(),
  competencyGrades: z
    .array(
      z.object({
        competency: z.enum(ICAO_COMPETENCY),
        grade: GradeSchema,
      }),
    )
    .refine((arr) => arr.length === ICAO_COMPETENCY.length, {
      message: `Exactly ${ICAO_COMPETENCY.length} competency grades required (one per ICAO competency)`,
    })
    .refine((arr) => new Set(arr.map((g) => g.competency)).size === ICAO_COMPETENCY.length, {
      message: 'Duplicate competencies in grade list',
    }),
});

const SignOffBody = z.object({
  signedByRole: z.enum(['TRI', 'TRE', 'LCE', 'LTC', 'HOT']),
  statement: z.string().min(8).max(2000),
  overallGrade: GradeSchema.optional(),
});

// Voiding requires a written reason (audit trail; KCAA can't accept a
// silently-deleted training record). Length floor mirrors the SignOff
// statement floor — short reasons aren't enough to defend in an audit.
const VoidBody = z.object({
  reason: z.string().min(8).max(2000),
});

const SessionParams = z.object({ sessionId: z.string().uuid() });
const PilotParams = z.object({ pilotId: z.string().uuid() });

export const sessionRoutes: FastifyPluginAsync = async (rawApp) => {
  const app = rawApp.withTypeProvider<ZodTypeProvider>();

  // --- CREATE draft session ---
  app.post(
    '/pilots/:pilotId/sessions',
    {
      schema: {
        params: PilotParams,
        body: CreateSessionBody,
        response: { 201: SessionResponse },
      },
    },
    async (request, reply) => {
      const operatorId = requireOperatorScope(request);
      requireRoleGroup(request.principal, 'SESSION_CREATE');
      const instructorUserId = request.principal.userId;
      const { pilotId } = request.params;
      const body = request.body;

      const created = await app.withOperatorScope(operatorId, async (db) => {
        // Verify the pilot belongs to THIS operator before linking a session
        // to it. The FK pilot_id -> pilots(id) is a system constraint that does
        // not honour RLS, so without this an in-tenant caller could attach a
        // session to another operator's pilot. RLS returns zero rows here for a
        // foreign pilotId.
        const [pilot] = await db
          .select({ id: pilots.id })
          .from(pilots)
          .where(eq(pilots.id, pilotId))
          .limit(1);
        if (!pilot) throw app.httpErrors.notFound(`Pilot ${pilotId} not found`);

        const [inserted] = await db
          .insert(sessions)
          .values({
            operatorId,
            pilotId,
            kind: body.kind,
            venue: body.venue,
            ...(body.ffsDesignation !== undefined ? { ffsDesignation: body.ffsDesignation } : {}),
            instructorUserId,
            startedAt: new Date(body.startedAt),
            ...(body.endedAt !== undefined ? { endedAt: new Date(body.endedAt) } : {}),
            status: 'DRAFT',
          })
          .returning();
        if (!inserted) throw app.httpErrors.internalServerError('Insert returned no row');

        await app.emitAuditEvent(db, request, {
          entityType: 'Session',
          entityId: inserted.id,
          action: 'CREATE',
          beforeState: null,
          afterState: inserted,
        });

        return inserted;
      });

      void reply.code(201);
      return toSessionResponse(created);
    },
  );

  // --- ADD exercise (with 8 competency grades atomically) ---
  app.post(
    '/sessions/:sessionId/exercises',
    {
      schema: {
        params: SessionParams,
        body: ExerciseInputBody,
        response: { 201: z.object({ exerciseId: z.string().uuid() }) },
      },
    },
    async (request, reply) => {
      const operatorId = requireOperatorScope(request);
      requireRoleGroup(request.principal, 'SESSION_CREATE');
      const { sessionId } = request.params;
      const body = request.body;

      const exerciseId = await app.withOperatorScope(operatorId, async (db) => {
        // Verify session is DRAFT (RLS already gates operator scope)
        const [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, sessionId))
          .limit(1);
        if (!session) throw app.httpErrors.notFound(`Session ${sessionId} not found`);
        if (session.status !== 'DRAFT') {
          throw app.httpErrors.conflict(
            `Session is ${session.status}; exercises can only be added while DRAFT`,
          );
        }

        // Insert exercise
        const [ex] = await db
          .insert(exercises)
          .values({
            operatorId,
            sessionId,
            ordinal: body.ordinal,
            title: body.title,
            reference: body.reference,
            ...(body.observableBehaviours !== undefined
              ? { observableBehaviours: body.observableBehaviours }
              : {}),
            ...(body.debriefNote !== undefined ? { debriefNote: body.debriefNote } : {}),
          })
          .returning();
        if (!ex) throw app.httpErrors.internalServerError('Exercise insert returned no row');

        // Insert all 8 competency grades atomically
        await db.insert(competencyGrades).values(
          body.competencyGrades.map((cg) => ({
            exerciseId: ex.id,
            operatorId,
            competency: cg.competency,
            scale: cg.grade.scale,
            value: cg.grade.scale === 'NOT_OBSERVED' ? null : String(cg.grade.value),
            notObservedReason: cg.grade.scale === 'NOT_OBSERVED' ? cg.grade.reason : null,
          })),
        );

        await app.emitAuditEvent(db, request, {
          entityType: 'Exercise',
          entityId: ex.id,
          action: 'CREATE',
          beforeState: null,
          afterState: { ...ex, competencyGrades: body.competencyGrades },
        });

        return ex.id;
      });

      void reply.code(201);
      return { exerciseId };
    },
  );

  // --- SIGN OFF session (DRAFT -> SIGNED_OFF) ---
  app.post(
    '/sessions/:sessionId/sign-off',
    {
      schema: {
        params: SessionParams,
        body: SignOffBody,
        response: {
          200: z.object({ sessionId: z.string().uuid(), signOffId: z.string().uuid() }),
        },
      },
    },
    async (request) => {
      const operatorId = requireOperatorScope(request);
      requireRoleGroup(request.principal, 'SESSION_SIGN_OFF');
      const signerUserId = request.principal.userId;
      const { sessionId } = request.params;
      const body = request.body;

      const result = await app.withOperatorScope(operatorId, async (db) => {
        const [session] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, sessionId))
          .limit(1);
        if (!session) throw app.httpErrors.notFound(`Session ${sessionId} not found`);
        if (session.status === 'SIGNED_OFF') {
          throw app.httpErrors.conflict('Session is already SIGNED_OFF');
        }
        if (session.status === 'VOIDED') {
          throw app.httpErrors.conflict('Cannot sign off a VOIDED session');
        }

        // Verify at least one exercise exists
        const exerciseList = await db
          .select({ id: exercises.id })
          .from(exercises)
          .where(eq(exercises.sessionId, sessionId));
        if (exerciseList.length === 0) {
          throw app.httpErrors.badRequest('Cannot sign off a session with zero exercises');
        }

        // Transition session: DRAFT -> SIGNED_OFF
        const [after] = await db
          .update(sessions)
          .set({
            status: 'SIGNED_OFF',
            ...(body.overallGrade !== undefined
              ? {
                  overallGradeScale: body.overallGrade.scale,
                  overallGradeValue:
                    body.overallGrade.scale === 'NOT_OBSERVED'
                      ? null
                      : String(body.overallGrade.value),
                }
              : {}),
            updatedAt: new Date(),
          })
          .where(eq(sessions.id, sessionId))
          .returning();
        if (!after) throw app.httpErrors.internalServerError('Update returned no row');

        // Insert SignOff row
        const [signOff] = await db
          .insert(signOffs)
          .values({
            sessionId,
            operatorId,
            signedByUserId: signerUserId,
            signedByRole: body.signedByRole,
            statement: body.statement,
          })
          .returning();
        if (!signOff) throw app.httpErrors.internalServerError('Sign-off insert returned no row');

        await app.emitAuditEvent(db, request, {
          entityType: 'Session',
          entityId: sessionId,
          action: 'SIGN_OFF',
          beforeState: session,
          afterState: { session: after, signOff },
        });

        return { sessionId, signOffId: signOff.id };
      });

      return result;
    },
  );

  // --- VOID session (DRAFT or SIGNED_OFF -> VOIDED) ---
  // Used to correct an erroneously-logged session without bypassing the
  // audit log. KCARs requires every voided training record to carry a
  // written reason that an inspector can review.
  app.post(
    '/sessions/:sessionId/void',
    {
      schema: {
        params: SessionParams,
        body: VoidBody,
        response: { 200: z.object({ sessionId: z.string().uuid() }) },
      },
    },
    async (request) => {
      const operatorId = requireOperatorScope(request);
      // Voiding is a governance action — TRI/TRE cannot self-void a
      // record they signed. Restricted to HoT / AM / PLATFORM_ADMIN.
      requireRoleGroup(request.principal, 'PILOT_DELETE');
      const { sessionId } = request.params;
      const { reason } = request.body;

      await app.withOperatorScope(operatorId, async (db) => {
        const [before] = await db
          .select()
          .from(sessions)
          .where(eq(sessions.id, sessionId))
          .limit(1);
        if (!before) throw app.httpErrors.notFound(`Session ${sessionId} not found`);
        if (before.status === 'VOIDED') {
          throw app.httpErrors.conflict('Session is already VOIDED');
        }

        const [after] = await db
          .update(sessions)
          .set({ status: 'VOIDED', updatedAt: new Date() })
          .where(eq(sessions.id, sessionId))
          .returning();

        // Use the generic UPDATE action — the before/after state captures
        // the DRAFT|SIGNED_OFF -> VOIDED transition; the void reason is
        // carried in afterState.voidReason so an inspector can audit the
        // justification. Adding a new AUDIT_ACTION enum value would
        // require a DB migration; deferring that until Sprint 5 when the
        // audit-read UI is built and we know which slices we want.
        await app.emitAuditEvent(db, request, {
          entityType: 'Session',
          entityId: sessionId,
          action: 'UPDATE',
          beforeState: before,
          afterState: { ...after, voidReason: reason },
        });
      });

      return { sessionId };
    },
  );

  // --- READ session (with exercises summary) ---
  app.get(
    '/sessions/:sessionId',
    { schema: { params: SessionParams, response: { 200: SessionResponse } } },
    async (request) => {
      const operatorId = requireOperatorScope(request);
      const { sessionId } = request.params;
      const row = await app.withOperatorScope(operatorId, async (db) => {
        const [r] = await db
          .select()
          .from(sessions)
          .where(and(eq(sessions.id, sessionId)))
          .limit(1);
        return r;
      });
      if (!row) throw app.httpErrors.notFound(`Session ${sessionId} not found`);
      return toSessionResponse(row);
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

function toSessionResponse(row: typeof sessions.$inferSelect): z.infer<typeof SessionResponse> {
  return {
    id: row.id,
    operatorId: row.operatorId,
    pilotId: row.pilotId,
    kind: row.kind,
    venue: row.venue,
    ffsDesignation: row.ffsDesignation ?? null,
    instructorUserId: row.instructorUserId,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
  };
}

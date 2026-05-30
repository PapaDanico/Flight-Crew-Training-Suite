import type { FastifyPluginAsync } from 'fastify';
import { sql } from 'drizzle-orm';

/**
 * GET /health — liveness + DB connectivity. No auth.
 */
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', { config: { auth: 'none' } }, async () => {
    let dbOk = false;
    let dbError: string | null = null;
    try {
      await app.db.execute(sql`SELECT 1`);
      dbOk = true;
    } catch (err) {
      dbError = err instanceof Error ? err.message : 'unknown';
    }
    return {
      status: dbOk ? 'ok' : 'degraded',
      checks: {
        api: 'ok',
        db: dbOk ? 'ok' : { status: 'error', message: dbError },
      },
      timestamp: new Date().toISOString(),
    };
  });
};

import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { setOperatorScope, type Database } from '@dnca/db';

interface TenantOptions {
  db: Database;
}

/**
 * Per-request Postgres RLS scoping. Sets `app.operator_id` via SET LOCAL
 * inside a transaction (pooling-safe; see ADR 0002).
 *
 * Every route that touches a tenant-scoped table MUST run inside the
 * transaction this plugin provides. Routes obtain it via the `db`
 * decoration set in onRequest — see routes/pilots.ts for the pattern.
 *
 * Sprint 1: the scoping is wired but routes still need to call
 * setOperatorScope explicitly inside their own transactions because
 * Fastify can't safely hold a connection across multiple await points
 * without a per-route transaction helper. That helper lands in Sprint 2.
 */
export const tenantPlugin: FastifyPluginAsync<TenantOptions> = async (app, opts) => {
  app.decorate('db', opts.db);
  app.decorate('withOperatorScope', async function <
    T,
  >(operatorId: string | null, fn: (db: Database) => Promise<T>): Promise<T> {
    return opts.db.transaction(async (tx) => {
      await setOperatorScope(tx as Database, operatorId);
      return fn(tx as Database);
    });
  });
};

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
    withOperatorScope: <T>(
      operatorId: string | null,
      fn: (db: Database) => Promise<T>,
    ) => Promise<T>;
  }
}

export default fp(tenantPlugin, { name: 'tenant', dependencies: ['auth'] });

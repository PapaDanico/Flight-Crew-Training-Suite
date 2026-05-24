import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

export type Database = NodePgDatabase<typeof schema>;

export interface CreateDatabaseOptions {
  connectionString: string;
  poolMax?: number;
  idleTimeoutMillis?: number;
}

export interface CreatedDatabase {
  db: Database;
  pool: pg.Pool;
  close(): Promise<void>;
}

export function createDatabase(opts: CreateDatabaseOptions): CreatedDatabase {
  const pool = new pg.Pool({
    connectionString: opts.connectionString,
    max: opts.poolMax ?? 10,
    idleTimeoutMillis: opts.idleTimeoutMillis ?? 30_000,
  });
  const db = drizzle(pool, { schema });
  return {
    db,
    pool,
    async close() {
      await pool.end();
    },
  };
}

/**
 * Sets the per-request tenant scoping for RLS policies. Call inside the
 * transaction that handles a request after authenticating the operator. The
 * SET LOCAL form scopes to the transaction so connection pooling is safe.
 *
 * Pass null to clear the operator scope (e.g. for cross-tenant admin queries
 * issued by PLATFORM_ADMIN, which must independently authorise the access).
 */
export async function setOperatorScope(db: Database, operatorId: string | null): Promise<void> {
  if (operatorId === null) {
    await db.execute(`RESET app.operator_id`);
    return;
  }
  await db.execute(`SET LOCAL app.operator_id = '${escapeUuid(operatorId)}'`);
}

function escapeUuid(value: string): string {
  if (!/^[0-9a-fA-F-]{36}$/.test(value)) {
    throw new Error('Invalid UUID for operator scope');
  }
  return value;
}

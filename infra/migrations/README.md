# Database migrations

Migrations are forward-only SQL files numbered `NNNN_<title>.sql`. They are run by drizzle-kit (`pnpm --filter @dnca/db migrate`) at deploy time and by Testcontainers Postgres in CI.

## Discipline

- **Forward-only.** A reverse migration is a new forward migration.
- **Bootstrap is hand-written.** `0001_initial.sql` includes RLS policies, audit-log triggers, role grants, and the `updated_at` trigger — none of which drizzle-kit auto-generates.
- **Subsequent additive migrations are generated.** Write the Drizzle schema in `packages/db/src/schema/`, run `pnpm --filter @dnca/db generate`, review the produced SQL, commit both schema and migration in the same change.
- **RLS / trigger / function changes are hand-written.** They live as post-table migrations with explicit numbers; drizzle-kit does not detect or modify them.
- **No destructive changes without an ADR.** Dropping a column, renaming a table, or altering an enum value affects KCAA-evidence reconstruction. Capture the rationale in an ADR before opening the migration PR.
- **Every migration is tested.** CI runs each migration against a fresh Testcontainers Postgres and verifies the resulting schema against the Drizzle source.

## Local development

```bash
# Spin up a local Postgres
docker run --rm -d --name fokker-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=fokker_dev \
  postgres:15

# Run migrations
DATABASE_URL=postgres://postgres:dev@localhost:5432/fokker_dev \
  pnpm --filter @dnca/db migrate

# Connect as the application role (created by 0001)
psql postgres://app_runtime:CHANGE_ME@localhost:5432/fokker_dev
```

## Tenant scoping in queries

Every request scopes its session to a single operator before running tenant-touching queries:

```ts
import { setOperatorScope } from '@dnca/db';

await db.transaction(async (tx) => {
  await setOperatorScope(tx, operatorIdFromAuth);
  // ...queries inside this transaction see only operatorIdFromAuth's rows.
});
```

Forgetting `setOperatorScope` returns zero rows from any RLS-protected table — the safe default. The PLATFORM_ADMIN role bypasses RLS and must independently authorise cross-tenant access, which emits a dedicated audit event.

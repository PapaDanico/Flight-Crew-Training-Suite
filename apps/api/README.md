# `@dnca/api`

Backend API for the DNCA Flight Crew Training Platform. Fastify (ADR 0007), WorkOS auth (ADR 0008), AWS `af-south-1` production target (ADR 0009).

## Status: Sprint 1 scaffold

Working today:

- Fastify boot + structured logging (pino)
- Config loading + validation via Zod (fail-fast on missing env)
- CORS / Helmet / rate-limit / sensible plugins
- **Auth plugin** — production WorkOS path stubbed (fails closed); dev/demo path attaches a synthetic `PLATFORM_ADMIN` principal scoped to the JAK demo operator
- **Tenant plugin** — `app.withOperatorScope(operatorId, fn)` runs `fn` inside a transaction with `SET LOCAL app.operator_id = …` (ADR 0002)
- **Audit plugin** — `app.emitAuditEvent(db, request, payload)` for ADR 0003 emission
- **`GET /health`** — liveness + DB connectivity
- **`GET /pilots`** — proof of end-to-end RLS-scoped DB read

Sprint 2 will add:

- WorkOS JWT verification + Organization → Operator lookup
- Per-route transaction helper (so every mutating route is automatically transactional + AuditEvent-emitting)
- Pilot CRUD (POST / PATCH / DELETE)
- Currency CRUD
- Session logging endpoints
- Integration tests via `app.inject()` against Testcontainers Postgres

## Run locally

```bash
# 1. Start Postgres + apply migrations
docker run --rm -d --name fokker-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=fokker_dev \
  postgres:15
DATABASE_URL=postgres://postgres:dev@localhost:5432/fokker_dev \
  psql "$DATABASE_URL" -f infra/migrations/0001_initial.sql

# 2. Configure env
cp apps/api/.env.example apps/api/.env
# Edit DATABASE_URL to use the app_runtime role
#   postgres://app_runtime:dev@localhost:5432/fokker_dev

# 3. Run
pnpm install
pnpm --filter @dnca/api dev
```

API listens on `http://localhost:3001` by default. Quick checks:

```bash
curl http://localhost:3001/health
curl http://localhost:3001/pilots   # demo principal -> JAK operator scope
```

## Production deploy (AWS af-south-1)

Sprint 5. `infra/terraform/` modules provision:

- ECS Fargate or App Runner (one service per environment)
- ALB + Route 53 + ACM-issued TLS
- Secrets Manager bindings for WorkOS + Anthropic + DB
- CloudWatch + OpenTelemetry → Grafana Cloud

See `docs/deployment/README.md` and ADR 0009 for the service map.

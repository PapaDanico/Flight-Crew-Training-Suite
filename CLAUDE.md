# CLAUDE.md

**Instructions for Claude Code agents working in this repository.**

This file gives you the context to be genuinely useful on this codebase. Read it fully before making changes. If anything contradicts what a user instructs in-session, the user's instruction wins — but flag the contradiction so they can correct the file.

---

## What this project is

A production-grade multi-tenant **flight crew training management platform** operated by **DN Consultancy Aviation** (DNCA) for East African AOC holders. Principal stakeholder is **Capt. Dan Moi Ng'ong'a**, TRI/TRE Fokker 70/100.

The platform is **aircraft-type-agnostic at the spine, type-specific by deployment** (ADR 0006). Fokker 70/100 is the production-ready primary calibration (DNCA's deepest type-rating expertise); additional types are added per operator deployment as a Phase-1 content task, not an engineering change.

Active operator deployments target: **Jubba Airways Kenya (JAK)** and **I-Fly Air Solutions**.

The platform is the software layer of a **forward-deployed engineering** consultancy model (Palantir-inspired). It is not a generic SaaS. Each operator deployment is bespoke configuration on top of reusable platform primitives.

A frozen **prototype** lives under `/prototype/` as a single-file React artifact. Treat it as a frozen specification of the intended UX and data model. The production build preserves its conceptual integrity while replacing browser-local storage with proper backend infrastructure.

---

## Repository state (snapshot)

Sprints 1–2 of the Operational MVP are shipped (write-path complete, web wired to API, WorkOS auth on). Sprint 3 hardening is in progress. The codebase today:

- **Monorepo:** pnpm workspaces — `apps/web`, `apps/api`, and five `@dnca/*` packages.
- **Frontend (`apps/web`):** Next.js 15 App Router, React 18, Tailwind, lucide-react, `@workos-inc/authkit-nextjs`. Live routes: dashboard, pilots, pilots/[id], sessions, sessions/[id], aircraft, compliance, assessments, login, callback, and three KCAA export print views under `/exports/*`. The web tier runs in three modes (decided per-request by `apps/web/lib/api-config.ts`): **workos** (signed-in session forwards a Bearer access token to the API), **demo** (`API_BASE_URL` + `DEMO_OPERATOR_ID` env, sends `x-demo-operator-id`), or **fixtures** (renders from `@dnca/domain` fixtures — CI and Vercel preview without a backend still produce usable UI). The page surfaces a source badge so a viewer always knows which mode is active.
- **Backend (`apps/api`):** Fastify 5 (ADR 0007). Plugins: `auth` (WorkOS JWT verification, fails closed in production; synthetic `PLATFORM_ADMIN` for dev), `tenant` (`app.withOperatorScope()` opens a transaction and runs `SET LOCAL app.operator_id` — ADR 0002), `audit` (`app.emitAuditEvent()` — ADR 0003), `zod-validator` (Zod at the route boundary via `fastify-type-provider-zod`). Routes: `GET /health`, `pilots`, `currency`, `sessions` (each with full CRUD where applicable; pilot/currency/session integration tests in `apps/api/test/` exercise the RLS + audit path). Structured logging via pino.
- **Database (`packages/db`):** Postgres 15 with Drizzle ORM (ADR 0005). Migrations in `infra/migrations/`: `0001_initial.sql` (hand-written: roles `app_runtime` + `platform_admin`, all enum types, every tenant-scoped table with `operator_id`, RLS policies, append-only audit triggers, `updated_at` triggers), `0002_fleet_variant_b737.sql` (additive enum extension for the B737 preview profile). CI runs both migrations against Postgres 15 and asserts RLS isolation and audit-log immutability.
- **Domain types (`@dnca/domain`):** Single source of truth (ADR 0004). Pure TypeScript, no runtime deps. Every entity, enum, branded ID, and pure domain function lives here. Other packages depend on it; it depends on nothing.
- **Regulatory ontology (`@dnca/ontology`):** KCARs 2025 model (LN 29/30/31/37/40/41/42 of 2026), ICAO Annex/Doc references, FAA 14 CFR + ACs, EASA Part-CAT/ORO/FCL, and the cross-reference matrix.
- **AI (`@dnca/prompts` + `apps/web/app/api/assessments/generate/route.ts`):** Versioned, citation-anchored prompt templates with Zod schemas, an `AircraftTypeProfile`-aware system block, prompt-cache markers, retry parser. The assessment proxy keeps the Anthropic key server-side, applies a per-IP sliding-window rate limit, runs a three-attempt parse-and-retry loop, and logs generations as JSON to stdout. `AuditEvent ASSESSMENT_GENERATED` emission moves to `apps/api` when the route ports across.
- **Exports (`@dnca/exports`):** Typed data assemblers; UI print views under `/exports/*`. **Crew Currency Snapshot**, **OM Cross-Reference Matrix**, and **Pilot Training File** are live (KCAA-aligned, Cmd-P → PDF). Compliance Evidence Pack and Session Report are queued.
- **Demo data:** Deterministic fixtures in `@dnca/domain/fixtures.ts`. Two demo operators showcase the type-extensibility model: **JAK = B737NG preview** (no session fixtures — the platform refuses to fabricate B737-specific exercises until a B737-qualified TRI/TRE populates the profile); **I-Fly = F70/100 production-ready** (4 pilots, rich session and grading data). Same dataset every demo; dates rebase against `asOf`. The Alpha One / Bravo Two / Charlie Three / Delta Four naming convention is preserved.
- **Infrastructure (`infra/terraform/`):** Terraform modules for the AWS `af-south-1` MVP topology (ADR 0010): VPC + subnets, ALB with host-based routing, ECS Fargate services for `api` + `web`, ECR repos, RDS Postgres 15 in private subnets, Secrets Manager bindings, IAM, security groups. `infra/docker-compose.yml` for local multi-service runs. `apps/api/Dockerfile` and `apps/web/Dockerfile` ship to ECR.
- **CI (`.github/workflows/ci.yml`):** Three jobs — `typecheck + test` (format check, `pnpm -r typecheck`, `pnpm -r test`), `migration smoke test` (applies 0001 + 0002, asserts RLS isolation + audit immutability), `api integration tests` (applies migrations, seeds JAK/I-Fly demo operators + fleets, runs `pnpm --filter @dnca/api test` against a real Postgres 15).

A prospective-operator demo walkthrough is in [`docs/demo/walkthrough.md`](./docs/demo/walkthrough.md). Deployment posture (Vercel demo + AWS `af-south-1` operator MVP) is in [`docs/deployment/README.md`](./docs/deployment/README.md) and ADRs 0009/0010.

---

## Your role

You are working alongside Capt. Dan Ng'ong'a, who is the domain expert and product owner. Capt. Ng'ong'a has deep aviation regulatory knowledge but is not a full-time software engineer. Your job:

1. **Implement the platform** to the specifications below
2. **Flag domain-critical decisions** — anything that affects what data a KCAA inspector would see, retention obligations, or audit trails — before making them autonomously
3. **Preserve regulatory and technical accuracy** at all costs — see "Things you must not get wrong" below
4. **Operate autonomously on engineering decisions** where the domain isn't directly affected — language idioms, library choices within the stack, test patterns, refactoring

Capt. Ng'ong'a frequently delegates with phrases like _"your call"_ or _"go for it"_. When this happens, proceed with best-practice choices and surface the major decision points after the fact, not before. Iterate; don't ask permission for every step.

---

## Things you must not get wrong

Aviation safety-critical and regulatory-critical facts. If any of these become uncertain during development, **stop and ask** rather than guess.

### F70/100 aircraft facts

- F70 and F100 both use **Rolls-Royce Tay Mk.620-15** — not different variants
- APU is **AlliedSignal GTCP36-150-RR**
- **Three** independent hydraulic systems (not two)
- F70 standard MTOW **37,995 kg**; F70 HGW (5Y-MMB) MTOW **39,915 kg**; F100 MTOW **44,450 kg**
- Takeoff flap convention: **Flaps 0 default · Flaps 8 performance · Flaps 15 reserved · Flaps 0 PROHIBITED on contaminated runways**
- TOCWS does **NOT** alert for Flaps 0 (valid configuration) — EICAS confirmation discipline is mandatory
- OEI technique: **PPAA** (Power / Pitch / Attitude / Airspeed) with **5° bank into the live engine**
- Approach speeds: **VMA-based** from PFD
- Grading scale: **AS / S / MS / BS** — operator convention; ICAO Doc 9868 PANS-TRG uses 1–5; alignment is a domain decision for Capt. Ng'ong'a

These facts are encoded once in `@dnca/domain` as `F70_100_PROFILE` (and the back-compat export `AIRCRAFT_FACTS`). The AI prompt block reads from the profile; the UI reads from the profile; the database enum allows the profile's variants. Do not duplicate or rephrase them in code or content — import them.

### B737NG (preview profile)

The B737NG profile is in `@dnca/domain` for type-extensibility, but operational technique and AI calibration fields are `pendingPrimarySource = true` until populated by a B737-qualified TRI/TRE. **Do not fabricate B737-specific facts.** The AI prompt falls back to a generic examiner role for preview profiles; do not work around that fallback.

### SimAero Dinard FFS

- Facility: SimAero Dinard, France
- Designation: **FR-101**
- Qualification level: **EASA Level C** (confirmed)
- Consequence: ZFTT not available at Level C; base training on actual aircraft is mandatory post-Skills Test per ICAO Doc 9868 §4.5.1

If asked to claim otherwise, refuse and surface the discrepancy.

### Regulatory framework

- Primary binding law: **KCARs 2025** — LN 29, 30, 31, 37, 40, 41, 42 of 2026
- **LN 42/2026 Third Schedule** is the binding OM content list (§2.1 — 34 clauses; §2.2 — 12 mandatory training topics)
- **Reg 17(3)** — manuals submitted to KCAA at least 30 days before intended implementation; implementation before approval prohibited
- **Reg 32(3) and 38(3)** — Human Factors statutory in checklist design
- **Reg 56(2)** — FDAP mandatory for aircraft >27,000 kg MTOW (both F70 and F100 qualify; `exceedsFdapThreshold()` lives in `@dnca/domain`)
- **Reg 84** — 12-month transition deadline ~06 March 2027 unless extended by Cabinet Secretary (exported as `REG_84_UNEXTENDED_DEADLINE`)
- **2018 regulations are repealed.** KCAA Advisory Circulars remain at 2018 vintage as subordinate guidance only. Where AC and KCARs 2025 conflict, the regulation prevails. Never anchor new code or content to the 2018 regulations.

### Decision framework

- **T-DODAR** (Time / Diagnose / Options / Decide / Act-Allocate / Review) is the standard across all JAK and I-Fly training and operational documentation. It **supersedes** any earlier reference to FORDEC. Never reintroduce FORDEC.

### Data and retention

- Training records retention: **5-year minimum** per KCARs; some items lifetime of licence
- FDR post-event retention: **60 days** (reg 18(3)(i))
- **Kenya Data Protection Act 2019** applies — DNCA is the data controller; registration with the Office of the Data Protection Commissioner is required; breach notification within 72 hours
- **No real pilot data in test or demo environments.** Demo fixtures use the Alpha One / Bravo Two / Charlie Three / Delta Four naming convention.

---

## Architecture (as built)

### Stack

| Layer        | Choice                                                                              | Status / ADR                                       |
| ------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------- |
| Frontend     | Next.js 15 (App Router) · React 18 · TypeScript strict · Tailwind · lucide-react    | In use                                             |
| Web→API      | Three modes: workos session / demo header / fixtures (`apps/web/lib/api-config.ts`) | In use                                             |
| Backend      | Fastify 5 with Zod + custom plugins (auth, tenant, audit)                           | In use — **ADR 0007**                              |
| Database     | PostgreSQL 15+ with row-level security                                              | In use — **ADR 0002**                              |
| ORM/migrate  | Drizzle ORM + drizzle-kit; raw SQL for RLS, triggers, role grants                   | In use — **ADR 0005**                              |
| Auth         | WorkOS AuthKit (SSO + Magic Link); WorkOS Organization → Operator lookup            | In use — **ADR 0008**                              |
| Audit log    | Append-only `audit_events` table with `BEFORE UPDATE/DELETE` triggers               | In use — **ADR 0003**; CI asserts immutability     |
| AI           | Anthropic Claude API via `@anthropic-ai/sdk`; pinned model strings in `@dnca/domain`| In use; Sonnet 4.6 / Opus 4.7 / Haiku 4.5          |
| Hosting (demo) | Vercel `fra1` — fixtures-only, no real operator data                              | In use                                             |
| Hosting (prod) | AWS `af-south-1` (Cape Town) — Kenya DPA 2019 residency                            | Terraform in `infra/terraform/` — **ADR 0009/0010**|
| Compute      | ECS Fargate (api + web), single ALB with host-based routing, RDS in private subnets | Terraform ready — **ADR 0010**                     |
| Secrets      | AWS Secrets Manager (`DATABASE_URL`, `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`, `ANTHROPIC_API_KEY`) | Wired through ECS task definitions     |
| Observability| pino + CloudWatch Logs → OpenTelemetry → Grafana Cloud                              | pino in use; OTEL/Grafana queued                   |
| CI/CD        | GitHub Actions; ECR push + `update-service --force-new-deployment` for rollouts     | CI in place; CD scripted, not yet workflow-driven  |

### Repository layout (actual)

```
/
├── apps/
│   ├── web/                          # Next.js 15 frontend
│   │   ├── app/
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── layout.tsx
│   │   │   ├── pilots/               # /pilots, /pilots/[id]
│   │   │   ├── sessions/             # /sessions, /sessions/[id]
│   │   │   ├── aircraft/             # type-profile-driven
│   │   │   ├── compliance/           # KCARs/ICAO/FAA/EASA matrix
│   │   │   ├── assessments/          # AI MCQ generator UI
│   │   │   ├── exports/              # KCAA print views
│   │   │   ├── login/  callback/     # WorkOS AuthKit handshake
│   │   │   └── api/
│   │   │       └── assessments/generate/route.ts   # AI proxy
│   │   ├── components/  lib/         # api-client.ts, api-config.ts
│   │   ├── Dockerfile · vercel.json · tailwind.config.ts
│   │   └── package.json
│   └── api/                          # Fastify backend — ADR 0007
│       ├── src/
│       │   ├── server.ts             # buildApp() / start()
│       │   ├── config.ts             # Zod-validated env loader
│       │   ├── plugins/              # auth, tenant, audit, zod-validator
│       │   └── routes/               # health, pilots, currency, sessions
│       ├── test/                     # node:test integration suites
│       ├── Dockerfile · .env.example
│       └── package.json
├── packages/
│   ├── domain/                       # @dnca/domain — single source of truth
│   │   └── src/  branded.ts · operator.ts · aircraft.ts · pilot.ts
│   │             currency.ts · currency-catalog.ts · competency.ts
│   │             training.ts · document.ts · governance.ts · ai.ts
│   │             aircraft-type-profile.ts · fixtures.ts
│   ├── ontology/                     # @dnca/ontology — regulatory citations
│   │   └── src/  kcars-2025.ts · icao.ts · faa.ts · easa.ts · cross-reference.ts
│   ├── db/                           # @dnca/db — Drizzle schema + client
│   │   └── src/  schema/ · client.ts · audit.ts
│   ├── prompts/                      # @dnca/prompts — versioned AI prompts
│   │   └── src/  system-prompt.ts · assessment-generation.ts · schemas.ts
│   │             parse.ts · version.ts
│   └── exports/                      # @dnca/exports — KCAA export builders
│       └── src/  crew-currency-snapshot.ts · pilot-training-file.ts
│                 om-cross-reference-matrix.ts
├── prototype/                        # Frozen single-file React artifact
├── docs/
│   ├── architecture/adr/             # 0001..0010 accepted ADRs
│   ├── audit/prototype-audit.md      # Phase-0 audit findings
│   ├── demo/walkthrough.md
│   └── deployment/README.md
├── infra/
│   ├── migrations/                   # 0001_initial.sql (hand-written),
│   │                                 # 0002_fleet_variant_b737.sql
│   ├── terraform/                    # AWS af-south-1 MVP topology
│   │                                 # alb · database · ecr · ecs · iam ·
│   │                                 # network · secrets · security · …
│   └── docker-compose.yml            # local multi-service dev
├── .github/workflows/ci.yml          # typecheck+test · migration · api integration
├── pnpm-workspace.yaml               # apps/* + packages/*
├── tsconfig.base.json                # strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
├── package.json                      # Node ≥22, pnpm 9
├── CLAUDE.md
└── README.md
```

### ADR index

| #    | Status   | Title                                                              |
| ---- | -------- | ------------------------------------------------------------------ |
| 0001 | Accepted | TypeScript strict everywhere                                       |
| 0002 | Accepted | Multi-tenancy via Postgres row-level security                      |
| 0003 | Accepted | Append-only audit log enforced by Postgres triggers                |
| 0004 | Accepted | `@dnca/domain` is the single source of truth for entity types      |
| 0005 | Accepted | Drizzle ORM + drizzle-kit for the database layer                   |
| 0006 | Accepted | `AircraftTypeProfile` as the type-extensibility plug-in pattern    |
| 0007 | Accepted | Fastify for the backend API                                        |
| 0008 | Accepted | WorkOS for authentication and SSO                                  |
| 0009 | Accepted | AWS `af-south-1` (Cape Town) for production hosting                |
| 0010 | Accepted | ECS Fargate MVP deployment topology on AWS `af-south-1`            |

New architectural decisions get a new ADR in `docs/architecture/adr/NNNN-title.md` and a row in the index in that directory's README. ADRs are append-only; reversals are new ADRs that supersede.

### Multi-tenancy (ADR 0002)

Single Postgres cluster, single schema, every tenant-scoped table carries `operator_id uuid not null`, every such table has an RLS policy keyed off `current_setting('app.operator_id')::uuid`. The Fastify `tenant` plugin opens a transaction and sets `app.operator_id` per request:

```ts
await app.withOperatorScope(operatorId, async (tx) => {
  // queries here see only operatorId's rows
});
```

Forgetting `withOperatorScope` returns zero rows — the safe default. The `platform_admin` role bypasses RLS; any cross-tenant access must emit a dedicated audit event.

### Authentication (ADR 0008)

The Fastify `auth` plugin verifies a WorkOS-issued JWT on every request, extracts the WorkOS Organization id, and resolves it to our `Operator.id` via `Operator.config.workosOrganizationId`. Routes never see WorkOS types — they receive a `{ user, operator, roles }` Principal.

- **Production:** `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD`, `NEXT_PUBLIC_WORKOS_REDIRECT_URI` set; web forwards the access token as Bearer; the API verifies via JOSE.
- **Dev/demo:** missing WorkOS env → the auth plugin attaches a synthetic `PLATFORM_ADMIN` principal scoped to the JAK demo operator. The web tier sends `x-demo-operator-id` for explicit operator selection.
- **Auto-provisioning is OFF.** First request from a new WorkOS Organization triggers an admin workflow — KCAA wants accountable onboarding.

Per-user RBAC (the 11 roles in `@dnca/domain.USER_ROLE`) lives in our DB, not in WorkOS. WorkOS provides identity; we provide authorisation.

### Core data model

Preserved verbatim from the prototype and now codified in `@dnca/domain`:

```
Operator (1) ──┬── Fleet (M)
               ├── Aircraft (M)             # per-registration data
               ├── Pilot (M)
               ├── Document (M)             # OM-A/B/C/D, training programmes
               └── User (M)                 # auth subjects

Pilot (1) ──┬── Currency (M)                # 23 tracked kinds
            ├── Session (M)
            └── AssessmentResult (M)

Session (1) ──┬── Exercise (M)
              ├── Grade (1, overall)
              ├── SignOff (1, by TRI/TRE)
              └── DebriefNote (1)

Exercise (M) ──── Competency (M)            # CBTA: 8 ICAO competencies, M:M

AuditEvent ──── all of the above            # immutable, append-only
```

Currency catalogue (23 items, in `currency-catalog.ts`):

- **Personal:** Class 1 Medical, ATPL/CPL, ELP Level, Passport/Visa
- **Type:** F70/100 Type Rating, OPC, LPC
- **Operational:** Line Check, Recurrent Ground, CRM/TEM, Dangerous Goods, Aviation Security, Aerodrome Qualification (captain category), Route Qualification, PIC Recency (90-day, 3 landings)
- **Safety:** SEP (Wet/Dry)
- **Special:** RVSM, EGPWS/TAWS, Windshear, UPRT, Cat II, Cat III (separately), Crew Pairing

### Audit logging (ADR 0003)

`audit_events` row per state change. Fields: `id`, `operator_id` (nullable for global events), `actor_user_id`, `actor_role`, `entity_type`, `entity_id`, `action` (enum incl. `ASSESSMENT_GENERATED`, `KCAA_SUBMISSION_*`, `AUTH_*`, `ROLE_*`), `before_state` (jsonb), `after_state` (jsonb), `occurred_at`, `request_id`, `ip_address`, `user_agent`.

Triggers reject `UPDATE` and `DELETE` regardless of role (including `platform_admin`). Break-glass is via an out-of-band `postgres` superuser session and is itself logged in an external incident record.

Every mutating Fastify route emits an `AuditEvent` via `app.emitAuditEvent(db, request, payload)` inside the same transaction as the state change. CI asserts immutability against a real Postgres in two of the three workflow jobs.

### Exports

KCAA-aligned formats are first-class:

| Export                       | Status   | Module                                       |
| ---------------------------- | -------- | -------------------------------------------- |
| Crew Currency Snapshot       | Shipped  | `@dnca/exports/crew-currency-snapshot`       |
| OM Cross-Reference Matrix    | Shipped  | `@dnca/exports/om-cross-reference-matrix`    |
| Pilot Training File          | Shipped  | `@dnca/exports/pilot-training-file`          |
| Session Report               | Queued   | (in prototype; rebuild after API)            |
| Compliance Evidence Pack     | Queued   | bundles manuals + training records + snapshots |

Default to **PDF** for inspector-facing exports (print views are server-rendered; "Cmd-P → Save as PDF"). CSV/JSON are developer-facing alternatives.

---

## Development workflow

### Prerequisites

- **Node ≥22** (see `.nvmrc` = `22`)
- **pnpm 9** (pinned via the `packageManager` field; pnpm-action-setup reads it automatically — don't add a `version:` arg in the workflow)
- **Postgres 15** locally for DB work (Docker is fine)

### Common commands

Run from the repo root unless noted.

```bash
pnpm install                          # workspace install (frozen lockfile in CI)

# Per-workspace, recursive
pnpm -r typecheck                     # all packages and apps
pnpm -r test                          # all tests
pnpm -r build                         # all builds
pnpm format                           # prettier write
pnpm format:check                     # prettier check (CI does this first)

# Web app
pnpm --filter @dnca/web dev           # dev server on :3000
pnpm --filter @dnca/web build         # next build (full type-check)
pnpm --filter @dnca/web start

# API server
pnpm --filter @dnca/api dev           # tsx watch on :3001 (default port)
pnpm --filter @dnca/api test          # node:test integration tests
pnpm --filter @dnca/api build         # tsc

# Database (after pnpm install)
docker run --rm -d --name fokker-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=fokker_dev postgres:15

DATABASE_URL=postgres://postgres:dev@localhost:5432/fokker_dev \
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f infra/migrations/0001_initial.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f infra/migrations/0002_fleet_variant_b737.sql

# Generate a new migration after schema edits in packages/db/src/schema/
pnpm --filter @dnca/db generate       # drizzle-kit generate; review the SQL
pnpm --filter @dnca/db migrate        # drizzle-kit migrate
pnpm --filter @dnca/db studio         # drizzle-kit studio

# Multi-service local
docker compose -f infra/docker-compose.yml up
```

For local AI generation in `apps/web`, set `ANTHROPIC_API_KEY` in `apps/web/.env.local`. For the API, copy `apps/api/.env.example` to `apps/api/.env` and point `DATABASE_URL` at the `app_runtime` role. Missing WorkOS env in the API triggers the dev synthetic-principal path.

### CI expectations

`.github/workflows/ci.yml` runs three jobs on every PR and on `main`:

1. **`typecheck + test`** — `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm -r typecheck`, `pnpm -r test`.
2. **`migration smoke test (Postgres 15)`** — applies `0001_initial.sql` + `0002_fleet_variant_b737.sql`, asserts RLS isolates two tenants, asserts `audit_events` rejects `UPDATE` and `DELETE`.
3. **`api integration tests (Postgres 15)`** — applies migrations, seeds JAK + I-Fly demo operators and fleets (B737 for JAK, F70/F70-HGW/F100 for I-Fly), runs `pnpm --filter @dnca/api test` against the live DB.

A change that breaks any of these blocks merge. Don't disable a job to make a PR green — fix the underlying issue.

---

## Coding conventions

### General

- **TypeScript everywhere.** No JavaScript except in build tooling that can't reasonably be TS (ADR 0001).
- **Strict mode on.** No `any` without `// TODO(claude): why any?` and a follow-up issue. `tsconfig.base.json` enables `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` — array index access yields `T | undefined`; optional props really mean optional.
- **ESM with explicit `.js` extensions.** All packages are `"type": "module"`; intra-package imports use `./foo.js` (not `./foo` and not `./foo.ts`) because that's what NodeNext/Bundler resolution and the `node:test`+`tsx` runner expect. Don't drop the extension.
- **Branded primitives** prevent identifier and date-string confusion: `OperatorId`, `PilotId`, `SessionId`, `IsoDate`, `IsoDateTime`. Build them with `as` casts at the data-source boundary only.
- **Names are domain-aligned.** `pilot.medicalExpiry`, not `pilot.med_exp`. Spell out aviation terms: `proficiencyCheck`, not `pc`.
- **File names are kebab-case.** Each entity gets one file in `@dnca/domain/src/<entity>.ts`; barrel re-exports in `index.ts`.
- **Prefer composition over inheritance.** Functional components, hooks, plain functions. Pure where possible; side-effects at the edges.

### Domain-first discipline (ADR 0004)

`@dnca/domain` is the single source of truth for every entity, enum, branded ID, and pure domain function. Backend (`apps/api`), frontend (`apps/web`), prompts, exporters, and DB schemas all import from it; nothing else defines a `Pilot`.

When an entity changes, the change lands in `@dnca/domain` first; downstream type-checks fail until they conform. That's the intended pressure direction.

### Frontend

- Tailwind utility classes only — no custom CSS unless tooling-required (print stylesheets are the exception).
- Server Components by default; Client Components only when interactivity demands it.
- Route module owns its components in `apps/web/app/<route>/_components/`; shared components live in `apps/web/components/`.
- Data fetching: Server Components call into `apps/web/lib/api-client.ts`, which decides between workos / demo / fixtures modes per request. Never call the API from a Client Component — auth materials must not leak to the browser.
- **No `localStorage` or `sessionStorage` for application data.** State goes through the server. Browser storage is for the frozen prototype only.

### Backend (`apps/api`)

- Routes organised by entity (`pilots.ts`, `currency.ts`, `sessions.ts`).
- Plugins handle cross-cutting concerns: `auth` decorates the request with `principal`; `tenant` provides `app.withOperatorScope()`; `audit` provides `app.emitAuditEvent()`; `zod-validator` enforces request and response schemas.
- Every mutating route opens a transaction via `withOperatorScope`, emits an `AuditEvent` in the same transaction, and returns a typed response validated by Zod.
- Input validation via `zod` schemas at the route boundary (`fastify-type-provider-zod`).
- Integration tests use `app.inject()` — no HTTP listener needed. See `apps/api/test/pilots.test.ts` for the established pattern.
- The web tier's assessment route is the reference for server-side AI integration. The same pattern (rate-limit → input validation → profile resolution → cacheable prompt build → parse-and-retry → typed envelope) ports to the API service when the AI route moves across.

### Database

- Schema in `packages/db/src/schema/` (Drizzle); migrations in `infra/migrations/`.
- **Forward-only.** A reverse migration is a new forward migration.
- **Bootstrap is hand-written.** `0001_initial.sql` includes RLS policies, audit-log triggers, role grants, and the `updated_at` trigger function — drizzle-kit does not generate those. Subsequent additive migrations (new columns, indexes, tables, enum extensions like `0002_fleet_variant_b737.sql`) are hand-written or drizzle-generated; review the SQL before commit.
- **RLS / trigger / function changes are hand-written** as post-table SQL migrations; never auto-generated.
- Postgres enums in `0001_initial.sql` must stay in lock-step with the corresponding TypeScript unions in `@dnca/domain`. When you add a value on one side, add it on the other in the same change.

### Testing

- **Unit tests** with `node:test` + `tsx`: `node --test --import tsx 'test/**/*.test.ts'`. See `@dnca/domain/test/*.test.ts` and `apps/api/test/*.test.ts` for the established patterns.
- **API integration tests** use Fastify `app.inject()` against a real Postgres (CI provisions one; locally point at your Docker Postgres).
- **End-to-end** for critical user journeys (Playwright — Sprint 4+).
- Critical journeys: pilot creation, session logging, sign-off, export generation, expiry notification, audit-log integrity, AI assessment generation, WorkOS sign-in.

### Security

- All routes authenticated by default; explicit opt-out for the small set of public endpoints (`/health`).
- Authorisation at the service layer, not just the route layer — defence in depth.
- Input + output validation via Zod at API boundaries.
- HTML-escape user-supplied text in all rendered output, including export print views (the prototype's `printSessionReport` had an open XSS surface — don't reintroduce that pattern).
- Rate-limit auth endpoints and AI proxy endpoints. The assessment route's per-IP in-memory limit is fine for a single-region demo; production swaps in Redis/Upstash. The Fastify global limit is 200/minute.
- Secrets in environment, never committed. Production secrets flow through AWS Secrets Manager → ECS task definition (ADR 0010). Local: `apps/web/.env.local`, `apps/api/.env`.
- Never include real pilot PII in AI prompts. `sanitiseTopic()` in `@dnca/prompts` rejects licence-number-shaped input before it reaches Anthropic.

### Errors and observability

- Structured logging — pino in `apps/api`, JSON-to-stdout in `apps/web`. Correlation IDs propagated via `request.id` (UUID v4 generated per request in Fastify).
- User-facing error messages are non-leaky; internal stack traces only to ops dashboards.
- Top-level error handler maps `ZodError → 400`, `httpError → statusCode`, everything else → 500 with a generic message.
- AI calls wrap in try/catch with timeout + retry; an Anthropic API blip must not take down a page.

---

## Domain-specific implementation notes

### Currency calculations

A currency record has `validFrom`, `validTo` (computed from `validFrom` + cycle months), and a derived `status`:

- **CURRENT** — > 90 days to expiry
- **CAUTION** — 31–90 days
- **ACTION** — 1–30 days
- **EXPIRED** — ≤ 0 days
- **NOT_APPLICABLE** — only valid for type-rating-derivative items during ITR

`statusFor()` and `mayBeNotApplicable()` live in `@dnca/domain/currency.ts`. The dashboard, currency tracker, KCAA exports, and the API's currency CRUD all flow through these — they cannot drift.

**Prototype bug fixed in `@dnca/domain`:** medical and licence are never `NOT_APPLICABLE`, regardless of training phase. Only type-rating-derivative currencies (OPC, LPC, Line Check, Recurrent Ground) can be N/A during ITR. Don't reintroduce the prototype's blanket N/A behaviour.

The dashboard counts at the **item level** (each pilot × currency cell), not at the pilot level — one pilot with three cautions counts three, not one (Phase-0 audit §2.5).

Currency mutations in the API follow a **regulated-records supersession** pattern: instead of `UPDATE`, a new currency row is `INSERT`ed and the prior row's `valid_to` is set to the new row's `valid_from - 1 day`. The audit log carries both rows. This preserves the historical record KCAA inspectors need.

### CBTA competency grading

ICAO Doc 9868 PANS-TRG defines **8 core competencies** (encoded in `competency.ts`): Application of Procedures · Communication · Aeroplane Flight Path Management (Automation) · Aeroplane Flight Path Management (Manual Control) · Leadership & Teamwork · Problem Solving & Decision Making · Situation Awareness · Workload Management.

The prototype mapped each exercise to a single competency via regex heuristic. **That is wrong.** Production grades all 8 competencies per exercise via observable behaviours. The API's `sessions` route enforces this on write; the session UI implements it on read; the radar chart aggregates across multi-competency exercises; operators can mark a competency `NOT_OBSERVED` for a given exercise where genuinely not observable.

### Stabilised approach gate

LN 42/2026 §2.1.25 does **not** specify gate heights — operators have submission flexibility. Gate values live in the Operator's OM-A and are configurable per operator (`OperatorConfig`). The prototype's hardcoded "1,000 ft AAL IMC / 500 ft AAL VMC" was JAK/I-Fly-specific and must not be assumed for new operators.

### KCAA submission flow

Reg 17(3) demands 30 days lead time. The platform:

1. Allows draft documents to be prepared
2. Calculates submission deadline as `implementationDate - 30 days`
3. Generates the KCAA transmittal letter automatically
4. Locks the document version on submission; subsequent changes create a new version
5. Tracks approval status (`DRAFT` → `SUBMITTED` → `UNDER_REVIEW` → `APPROVED` | `RETURNED_FOR_REVISION` → `SUPERSEDED` | `WITHDRAWN`)

These statuses are enums in `@dnca/domain` and Postgres alike — keep them in lock-step.

### Document version control

Manuals are versioned per page, not per document. Each page carries last-revision date and revision status; a Letter of Effective Pages (LEP) is auto-generated. Diff view for revisions is a high-value capability for Heads of Training.

### Aircraft type extensibility (ADR 0006)

New aircraft types are content, not engineering. Create an `AircraftTypeProfile` in `@dnca/domain/aircraft-type-profile.ts` with status `preview`; populate manufacturer facts, operational profile, and AI calibration block when a type-qualified TRI/TRE clears the content; promote to `production-ready`. A `preview` profile's missing `technicalFactsBlock` makes the AI prompt fall back to a generic examiner role — the "don't generate fake aviation facts" rule is structural, not just advisory.

The B737NG preview profile demonstrates the model end-to-end: a Postgres enum extension (`0002_fleet_variant_b737.sql`), a structurally-present `B737_PROFILE` in the domain, and JAK demo fleets that exercise the preview path without any fabricated aviation content.

---

## AI integration

### Assessment generation (live)

5-question MCQ generation for any topic, calibrated to type-rated pilots. Production hardening done:

1. Server-side proxy at `apps/web/app/api/assessments/generate/route.ts` — API key never reaches the browser.
2. **Zod schema validation** of the model response (`@dnca/prompts/schemas.ts`).
3. **Retry on parse failure** — up to 3 attempts with a follow-up message; structured error returned otherwise.
4. **Per-IP sliding-window rate limit** — 5 requests / 5 minutes (in-memory; swap to Redis for production).
5. **PII sanitisation** — `sanitiseTopic()` rejects licence-number-shaped input.
6. **Prompt caching** — `cache_control: ephemeral` on the static calibration block; reuse across requests.
7. **Versioned prompts** — `PROMPT_VERSIONS.assessmentGeneration` bumps on any wording change; the version goes into the audit trail.
8. **stdout JSON logging** today; the route ports to `apps/api` so `AuditEvent ASSESSMENT_GENERATED` lands inside the same transactional middleware as the other mutations.

### Document drafting (future)

AI-assisted drafting of OM amendments, training programme updates, KCAA submission cover letters. Always human-in-the-loop — AI output is a draft, never auto-submitted.

### Model selection

Pinned in `@dnca/domain/ai.ts` as `ANTHROPIC_MODELS`:

- Assessment generation: `claude-sonnet-4-6`
- Document drafting: `claude-opus-4-7`
- Routine summarisation: `claude-haiku-4-5`

Pin model strings; do not rely on aliases. The model id used per generation is part of the audit trail. Bump only via an ADR that captures the upgrade rationale.

---

## Build sequence

| Sprint | Weeks | Goal                                                                                                       | Status                                |
| ------ | ----- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 1      | 1–2   | Foundation — monorepo, `@dnca/domain`, Postgres schema, RLS, audit triggers, one tenant.                   | **Done**                              |
| 2      | 3–4   | UI port + Operational MVP — dashboard/pilots/sessions/aircraft/compliance pages; Fastify API; WorkOS auth. | **Done**                              |
| 3      | 5–6   | Hardening — RBAC, KCAA exports, document version control, notification engine.                             | KCAA exports shipped; RBAC + docs WIP |
| 4      | 7–8   | Domain depth — schema-validated AI (done early), multi-competency CBTA, citation engine, per-operator config. | AI + CBTA done; citations + config WIP|
| 5      | 9–10  | Production — multi-tenant cutover, deployment automation, observability, security review, ODPC registration.  | Vercel demo live; AWS Terraform ready |

Each sprint ends with a deployable build and a demo to Capt. Ng'ong'a.

---

## Things to avoid

- **Don't reintroduce 2018 regulations.** They are repealed.
- **Don't reintroduce FORDEC.** T-DODAR is the standard.
- **Don't use `localStorage` for real data.** Browser storage is for the prototype only.
- **Don't generate fake/illustrative aviation facts.** If unsure about an F70 system detail, stop and ask. The product's credibility rests on technical accuracy. For preview profiles (B737NG), do not work around the generic examiner fallback.
- **Don't bypass the audit log.** Every state change must be recorded. No "internal" writes that skip `app.emitAuditEvent()`.
- **Don't call the API from a Client Component.** Auth materials must not reach the browser. Server Components only; `apps/web/lib/api-client.ts` is the single ingress point.
- **Don't enable auto-provisioning for WorkOS Organizations.** First request from a new Organization triggers a manual DNCA admin workflow — KCAA wants accountable onboarding.
- **Don't store real pilot data in test or demo environments.** Demo fixtures only (Alpha One / Bravo Two pattern).
- **Don't duplicate aviation facts.** Import `F70_100_PROFILE` (or `AIRCRAFT_FACTS`) from `@dnca/domain`. A fact in two places will drift.
- **Don't drop `.js` import extensions.** ESM + tsx + node:test all require them.
- **Don't add a `version:` arg to the `pnpm/action-setup@v4` step.** It reads `packageManager` from `package.json`; an explicit arg conflicts.
- **Don't anchor anything to a specific year or named CAA-AC document without checking** whether it's been superseded. KCAA Advisory Circulars at 2018 vintage are subordinate to KCARs 2025.

---

## Open questions

Resolved decisions are recorded in ADRs above. Still open, to be decided as work progresses (not blockers):

1. **Grading scale alignment** — keep AS/S/MS/BS or align to ICAO Doc 9868 1–5? Operator-by-operator or platform-wide? (Postgres carries both enums and a `grade_scale` discriminator today.)
2. **CBTA grading granularity UX** — confirm the per-exercise multi-competency grading interaction model.
3. **Notification channels** — email-only initially, or also SMS via Africa's Talking (popular Kenyan provider)?
4. **Languages** — English only initially? Kiswahili in scope? French (for non-Kenyan East African operators)?
5. **NAT Gateway / private compute** for the AWS topology — Sprint 5 if a future operator's auditor flags public-IP-on-Fargate as a finding (ADR 0010 §"Things this defers").

---

## Working with Capt. Ng'ong'a

A few practical notes:

- He frequently writes "your call" or "go for it" — proceed autonomously, flag major decisions after.
- He grades work on a 1–10 scale; he targets 9–10/10; ratings below 7 trigger rebuild with source review.
- He prefers dense, complete responses over many small ones.
- He values factual accuracy from source documents over generic patterns.
- He has the regulatory documents — when you need a primary source, ask him to share rather than guessing.
- He has been working with another AI through the chat interface to build the prototype; conversation continuity is important. If something looks like it contradicts an earlier decision, ask before changing.
- DNCA brand colours: navy and amber (the site header is the reference — navy `bg-navy-900` band, amber `border-amber-500` accent). Jetways brand colours: navy and blue (for any Jetways-derivative work).

---

## Reference materials in this repo

- `prototype/` — the original single-file React artifact (frozen reference)
- `docs/regulatory/` — primary regulatory source PDFs (KCARs LNs, ICAO docs, FAA ACs, EASA AMC) [populate as files arrive]
- `docs/architecture/adr/` — accepted ADRs 0001–0010
- `docs/audit/prototype-audit.md` — Phase-0 audit against project objectives
- `docs/demo/walkthrough.md` — 10-minute prospective-operator demo script
- `docs/deployment/README.md` — Vercel-demo + AWS-production deployment guide
- `infra/terraform/README.md` — `terraform apply` runbook for the af-south-1 MVP

When adding a new architectural decision, write an ADR in `docs/architecture/adr/NNNN-title.md` and add it to the index in that directory's README.

---

_This file is the source of truth for Claude Code working in this repository. Update it when project direction changes; do not let it drift from reality._

_Last updated: 27 May 2026 — reflects Sprints 1–2 of the Operational MVP shipped: Fastify API with WorkOS auth, AWS af-south-1 Terraform topology (ADRs 0007–0010), B737NG preview profile, and the three-mode web→API wiring._

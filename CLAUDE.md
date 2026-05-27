# CLAUDE.md

**Instructions for Claude Code agents working in this repository.**

This file gives you the context to be genuinely useful on this codebase. Read it fully before making changes. If anything contradicts what a user instructs in-session, the user's instruction wins — but flag the contradiction so they can correct the file.

---

## What this project is

A production-grade multi-tenant platform for **Fokker 70/100 flight crew training management** operated by **DN Consultancy Aviation** (DNCA) for East African AOC holders. Principal stakeholder is **Capt. Dan Moi Ng'ong'a**, TRI/TRE Fokker 70/100.

Active operator deployments target: **Jubba Airways Kenya (JAK)** and **I-Fly Air Solutions**.

The platform is the software layer of a **forward-deployed engineering** consultancy model (Palantir-inspired). It is not a generic SaaS. Each operator deployment is bespoke configuration on top of reusable platform primitives.

The repo is **aircraft-type-agnostic at the spine, type-specific by deployment** (ADR 0006). F70/100 is the production-ready primary calibration; E190 is a preview profile; new types are a content task, not an engineering change.

A frozen **prototype** lives under `/prototype/` as a single-file React artifact. Treat it as a frozen specification of the intended UX and data model. The production rebuild preserves its conceptual integrity while replacing browser-local storage with proper backend infrastructure.

---

## Repository state (snapshot)

Sprint 1 (foundation) and Sprint 2 (UI port) are shipped; Sprint 3 (hardening / exports) is substantially complete. The codebase today:

- **Monorepo:** pnpm workspaces — `apps/web` + five `@dnca/*` packages.
- **Frontend:** Next.js 15 App Router, React 18, Tailwind, lucide-react. Eight live routes (dashboard, pilots, pilots/[id], sessions, sessions/[id], aircraft, compliance, assessments) plus three KCAA export print views.
- **Backend (current):** Next.js Route Handlers under `apps/web/app/api/*`. A dedicated Fastify/NestJS service is **deferred** — when it lands, the auth + audit middleware moves there. Don't add a separate backend app unless that decision is made explicitly (it's still listed in "Open questions").
- **Database:** Postgres 15 schema in `packages/db` (Drizzle ORM — ADR 0005). Bootstrap migration `infra/migrations/0001_initial.sql` is hand-written and creates roles (`app_runtime`, `platform_admin`), all enum types, every tenant-scoped table with `operator_id`, RLS policies (ADR 0002), append-only audit triggers (ADR 0003), and `updated_at` triggers. CI runs the migration against Postgres 15 and asserts both RLS isolation and audit-log immutability.
- **Domain types:** `@dnca/domain` is the single source of truth (ADR 0004). Pure TypeScript, no runtime deps. Every entity, enum, branded ID, and pure domain function lives here. Other packages depend on it; it depends on nothing.
- **Regulatory ontology:** `@dnca/ontology` ships the KCARs 2025 model (LN 29/30/31/37/40/41/42 of 2026), ICAO Annex/Doc references, FAA 14 CFR + ACs, EASA Part-CAT/ORO/FCL, and the cross-reference matrix.
- **AI:** `@dnca/prompts` ships versioned, citation-anchored prompt templates with Zod schemas, an `AircraftTypeProfile`-aware system block, prompt-cache markers, and a retry parser. `apps/web/app/api/assessments/generate/route.ts` is the server-side proxy (Anthropic key never reaches the browser, sliding-window per-IP rate limit, three-attempt parse-and-retry loop, JSON-to-stdout logging — AuditEvent emission is wired in when the API service lands).
- **Exports:** `@dnca/exports` provides typed data assemblers; UI print views render under `/exports/*`. **Crew Currency Snapshot**, **OM Cross-Reference Matrix**, and **Pilot Training File** are live (KCAA-aligned, "Cmd-P → PDF"). Compliance Evidence Pack and Session Report are queued.
- **Demo data:** deterministic fixtures in `@dnca/domain` (`DEMO_OPERATORS`, `DEMO_PILOTS`, `buildDemoCurrencyRecords(asOf)`). Same dataset every demo; dates rebase against `asOf`. The frozen-prototype naming convention (Capt. Alpha One, F/O Bravo Two …) is preserved.
- **CI:** `.github/workflows/ci.yml` runs format-check, `pnpm -r typecheck`, `pnpm -r test`, plus a Postgres-15 service container that smoke-tests the migration, RLS, and audit immutability.

A prospective-operator demo walkthrough is in [`docs/demo/walkthrough.md`](./docs/demo/walkthrough.md). Deployment posture (Vercel demo + AWS `af-south-1` production) is in [`docs/deployment/README.md`](./docs/deployment/README.md).

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

| Layer        | Choice                                                                                              | Status                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Frontend     | Next.js 15 (App Router) · React 18 · TypeScript strict · Tailwind · lucide-react                    | In use                                                                                  |
| API surface  | Next.js Route Handlers (server-only) — `apps/web/app/api/*`                                         | Interim until a dedicated backend service is decided                                    |
| Backend svc  | Fastify vs NestJS                                                                                   | Open — defer until Sprint 4 demands it                                                  |
| Database     | PostgreSQL 15+ with row-level security (ADR 0002)                                                   | In use                                                                                  |
| ORM/migrate  | Drizzle ORM + drizzle-kit (ADR 0005); custom SQL for RLS, triggers, roles                           | In use                                                                                  |
| Auth         | WorkOS vs Clerk                                                                                     | Open — magic-link fallback envisaged                                                    |
| Audit log    | Append-only `audit_events` table with `BEFORE UPDATE/DELETE` triggers (ADR 0003)                    | In use; CI asserts immutability                                                         |
| AI           | Anthropic Claude API via `@anthropic-ai/sdk`; pinned model strings in `@dnca/domain`                | In use; Sonnet 4.6 for assessment, Opus 4.7 for drafting, Haiku 4.5 for summarisation   |
| Object store | S3-compatible                                                                                       | Pending — for KCAA export archive + WORM audit-log shipping (Sprint 5)                  |
| Hosting      | **Demo:** Vercel `fra1`. **Production:** AWS `af-south-1` (Cape Town) — Kenya DPA 2019 residency.   | Demo on Vercel; production region accepted, Azure South Africa North is fallback        |
| Observabil.  | OpenTelemetry → Grafana Cloud or Datadog                                                            | Pending — Sprint 5                                                                      |
| CI/CD        | GitHub Actions; manual production promotion gate                                                    | CI in place; promotion gate pending                                                     |

### Repository layout (actual)

```
/
├── apps/
│   └── web/                          # Next.js 15 frontend + API routes
│       ├── app/
│       │   ├── page.tsx              # Dashboard
│       │   ├── layout.tsx
│       │   ├── globals.css
│       │   ├── pilots/               # /pilots, /pilots/[id]
│       │   ├── sessions/             # /sessions, /sessions/[id]
│       │   ├── aircraft/             # type-profile-driven
│       │   ├── compliance/           # KCARs/ICAO/FAA/EASA matrix
│       │   ├── assessments/          # AI MCQ generator UI
│       │   ├── exports/              # KCAA print views
│       │   │   ├── crew-currency-snapshot/
│       │   │   ├── pilot-training-file/
│       │   │   └── om-cross-reference-matrix/
│       │   └── api/
│       │       └── assessments/generate/route.ts
│       ├── components/               # Shared web components
│       ├── tailwind.config.ts
│       ├── vercel.json
│       └── package.json
├── packages/
│   ├── domain/                       # @dnca/domain — single source of truth
│   │   ├── src/
│   │   │   ├── branded.ts            # OperatorId, PilotId, IsoDate, …
│   │   │   ├── operator.ts, aircraft.ts, pilot.ts
│   │   │   ├── currency.ts           # statusFor, mayBeNotApplicable, thresholds
│   │   │   ├── currency-catalog.ts   # 23-item catalogue
│   │   │   ├── competency.ts         # ICAO 8 competencies, grade scales
│   │   │   ├── training.ts           # Session, Exercise, Grade, SignOff
│   │   │   ├── document.ts           # OM-A/B/C/D, versions, KCAA submission
│   │   │   ├── governance.ts         # AuditEvent, User, RoleAssignment
│   │   │   ├── ai.ts                 # ANTHROPIC_MODELS, PromptVersion
│   │   │   ├── aircraft-type-profile.ts  # ADR 0006 plug-in
│   │   │   └── fixtures.ts           # DEMO_* deterministic fixtures
│   │   └── test/                     # node:test + tsx
│   ├── ontology/                     # @dnca/ontology — regulatory citations
│   │   └── src/  kcars-2025.ts · icao.ts · faa.ts · easa.ts · cross-reference.ts
│   ├── db/                           # @dnca/db — Drizzle schema + client
│   │   ├── src/
│   │   │   ├── schema/               # operator, aircraft, pilot, currency,
│   │   │   │                         # training, document, governance, enums
│   │   │   ├── client.ts             # setOperatorScope (sets app.operator_id)
│   │   │   └── audit.ts
│   │   └── drizzle.config.ts         # out → ../../infra/migrations
│   ├── prompts/                      # @dnca/prompts — versioned AI prompts
│   │   └── src/  system-prompt.ts · assessment-generation.ts · schemas.ts (zod)
│   │             parse.ts · version.ts (PROMPT_VERSIONS)
│   └── exports/                      # @dnca/exports — KCAA export builders
│       └── src/  crew-currency-snapshot.ts · pilot-training-file.ts
│                 om-cross-reference-matrix.ts
├── prototype/                        # Frozen single-file React artifact
├── docs/
│   ├── architecture/adr/             # 0001..0006 accepted ADRs (+ README)
│   ├── audit/prototype-audit.md      # Phase-0 audit findings
│   ├── demo/walkthrough.md           # 10-min demo script
│   └── deployment/README.md
├── infra/
│   └── migrations/                   # 0001_initial.sql hand-written;
│                                     # subsequent migrations drizzle-generated
├── .github/workflows/ci.yml
├── pnpm-workspace.yaml               # apps/* + packages/*
├── tsconfig.base.json                # strict + noUncheckedIndexedAccess +
│                                     # exactOptionalPropertyTypes
├── package.json                      # Node ≥22, pnpm 9
├── CLAUDE.md
└── README.md
```

### ADR index

Architectural decisions live in `docs/architecture/adr/`:

| #    | Status   | Title                                                              |
| ---- | -------- | ------------------------------------------------------------------ |
| 0001 | Accepted | TypeScript strict everywhere                                       |
| 0002 | Accepted | Multi-tenancy via Postgres row-level security                      |
| 0003 | Accepted | Append-only audit log enforced by Postgres triggers                |
| 0004 | Accepted | `@dnca/domain` is the single source of truth for entity types      |
| 0005 | Accepted | Drizzle ORM + drizzle-kit for the database layer                   |
| 0006 | Accepted | `AircraftTypeProfile` as the type-extensibility plug-in pattern    |

New architectural decisions get a new ADR in `docs/architecture/adr/NNNN-title.md`. ADRs are append-only; reversals are new ADRs that supersede.

### Multi-tenancy (ADR 0002)

Single Postgres cluster, single schema, every tenant-scoped table carries `operator_id uuid not null`, every such table has an RLS policy keyed off `current_setting('app.operator_id')::uuid`. Application sets it per request:

```ts
import { setOperatorScope } from '@dnca/db';

await db.transaction(async (tx) => {
  await setOperatorScope(tx, operatorIdFromAuth);
  // queries here see only operatorIdFromAuth's rows
});
```

Forgetting `setOperatorScope` returns zero rows — the safe default. The `platform_admin` role bypasses RLS and any cross-tenant access must emit a dedicated audit event.

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

Mutation routes must emit an `AuditEvent` — to be enforced by middleware in the API service. Today the assessment route logs to stdout as JSON; the proper `AuditEvent` emission lands with the API service.

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
- **pnpm 9** (the `packageManager` field pins this)
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

# Database (after pnpm install)
docker run --rm -d --name fokker-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=fokker_dev postgres:15

DATABASE_URL=postgres://postgres:dev@localhost:5432/fokker_dev \
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f infra/migrations/0001_initial.sql

# Generate a new migration after schema edits in packages/db/src/schema/
pnpm --filter @dnca/db generate       # drizzle-kit generate; review the SQL
pnpm --filter @dnca/db migrate        # drizzle-kit migrate
pnpm --filter @dnca/db studio         # drizzle-kit studio
```

For local AI generation, set `ANTHROPIC_API_KEY` in `apps/web/.env.local`. Without it the route returns a config error rather than crashing.

### CI expectations

`.github/workflows/ci.yml` runs on every PR and on `main`:

1. `pnpm install --frozen-lockfile`
2. `pnpm format:check`
3. `pnpm -r typecheck`
4. `pnpm -r test`
5. **Migration smoke test** in a Postgres 15 service container:
   - applies `0001_initial.sql`
   - asserts RLS isolates two tenants
   - asserts `audit_events` rejects `UPDATE` and `DELETE`

A change that breaks any of these blocks merge. Don't disable the smoke test to make a PR green — fix the underlying issue.

---

## Coding conventions

### General

- **TypeScript everywhere.** No JavaScript except in build tooling that can't reasonably be TS (ADR 0001).
- **Strict mode on.** No `any` without `// TODO(claude): why any?` and a follow-up issue. `tsconfig.base.json` enables `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` — array index access yields `T | undefined`; optional props really mean optional.
- **ESM with explicit `.js` extensions.** Packages are `"type": "module"`; intra-package imports use `./foo.js` (not `./foo` and not `./foo.ts`) because that's what NodeNext/Bundler resolution and the `node:test`+`tsx` runner expect. Don't drop the extension.
- **Branded primitives** prevent identifier and date-string confusion: `OperatorId`, `PilotId`, `SessionId`, `IsoDate`, `IsoDateTime`. Build them with `as` casts at the data-source boundary only.
- **Names are domain-aligned.** `pilot.medicalExpiry`, not `pilot.med_exp`. Spell out aviation terms: `proficiencyCheck`, not `pc`.
- **File names are kebab-case.** Each entity gets one file in `@dnca/domain/src/<entity>.ts`; barrel re-exports in `index.ts`.
- **Prefer composition over inheritance.** Functional components, hooks, plain functions. Pure where possible; side-effects at the edges.

### Domain-first discipline (ADR 0004)

`@dnca/domain` is the single source of truth for every entity, enum, branded ID, and pure domain function. Backend, frontend, prompts, exporters, and DB schemas import from it; nothing else defines a `Pilot`.

When an entity changes, the change lands in `@dnca/domain` first; downstream type-checks fail until they conform. That's the intended pressure direction.

### Frontend

- Tailwind utility classes only — no custom CSS unless tooling-required (print stylesheets are the exception).
- Server Components by default; Client Components only when interactivity demands it.
- Route module owns its components in `apps/web/app/<route>/_components/`; shared components live in `apps/web/components/`.
- Data fetching via Server Components reading typed packages directly (`@dnca/domain` fixtures today; DB tomorrow). Avoid client-side `fetch` for first paint.
- **No `localStorage` or `sessionStorage` for application data.** State goes through the server. Browser storage is for the frozen prototype only.

### Backend / API

- Routes organised by entity (`/api/pilots`, `/api/sessions`, …).
- Service layer separates HTTP concerns from business logic; repositories wrap DB access. No raw SQL in handlers except for performance-critical paths.
- Every mutation route emits an `AuditEvent` — to be enforced by middleware once the API service lands, not by hope.
- Input validation via `zod` schemas at the API boundary (see `@dnca/prompts/schemas.ts` for the pattern).
- The assessment route is the current reference for server-side AI integration: rate-limit → input validation → profile resolution → prompt build (cacheable static block + dynamic block) → parse-and-retry loop → typed response envelope. Match that shape when adding new AI routes.

### Database

- Schema in `packages/db/src/schema/` (Drizzle); migrations in `infra/migrations/`.
- **Forward-only.** A reverse migration is a new forward migration.
- **Bootstrap is hand-written.** `0001_initial.sql` includes RLS policies, audit-log triggers, role grants, and the `updated_at` trigger function — drizzle-kit does not generate those. Subsequent additive migrations (new columns, indexes, tables) are drizzle-generated and reviewed before commit.
- **RLS / trigger / function changes are hand-written** as post-table SQL migrations; never auto-generated.
- Postgres enums in the bootstrap migration must stay in lock-step with the corresponding TypeScript unions in `@dnca/domain`. When you add a value on one side, add it on the other in the same change.

### Testing

- **Unit tests** with `node:test` + `tsx`: `node --test --import tsx 'test/**/*.test.ts'`. See `@dnca/domain/test/*.test.ts` for the established pattern.
- **Integration tests** against a real Postgres (Testcontainers — to land alongside the DB-touching repositories).
- **End-to-end** for critical user journeys (Playwright — Sprint 4+).
- Critical journeys: pilot creation, session logging, sign-off, export generation, expiry notification, audit-log integrity, AI assessment generation.

### Security

- All routes authenticated by default; explicit opt-out for the small set of public endpoints.
- Authorisation at the service layer, not just the route layer — defence in depth.
- Input validation via `zod` at API boundaries.
- HTML-escape user-supplied text in all rendered output, including the export print views (the prototype's `printSessionReport` had an open XSS surface — don't reintroduce that pattern).
- Rate-limit auth endpoints and AI proxy endpoints. The current per-IP sliding-window rate limit in the assessment route is in-memory and adequate for a single-region demo; production swaps in Redis/Upstash.
- Secrets in environment, never committed. `apps/web/.env.local` for local development.
- Never include real pilot PII in AI prompts. `sanitiseTopic()` in `@dnca/prompts` rejects licence-number-shaped input before it reaches Anthropic.

### Errors and observability

- Structured logging (JSON to stdout); correlation IDs propagated.
- User-facing error messages are non-leaky; internal stack traces only to ops dashboards.
- AI calls wrap in try/catch with timeout + retry; an Anthropic API blip must not take down a page.
- The assessment route's `console.log(JSON.stringify({ event, model, promptVersion, … }))` pattern is the interim observability surface — fine for now; OpenTelemetry replaces it in Sprint 5.

---

## Domain-specific implementation notes

### Currency calculations

A currency record has `validFrom`, `validTo` (computed from `validFrom` + cycle months), and a derived `status`:

- **CURRENT** — > 90 days to expiry
- **CAUTION** — 31–90 days
- **ACTION** — 1–30 days
- **EXPIRED** — ≤ 0 days
- **NOT_APPLICABLE** — only valid for type-rating-derivative items during ITR

`statusFor()` and `mayBeNotApplicable()` live in `@dnca/domain/currency.ts`. The dashboard, currency tracker, and KCAA exports all flow through these — they cannot drift.

**Prototype bug fixed in `@dnca/domain`:** medical and licence are never `NOT_APPLICABLE`, regardless of training phase. Only type-rating-derivative currencies (OPC, LPC, Line Check, Recurrent Ground) can be N/A during ITR. Don't reintroduce the prototype's blanket N/A behaviour.

The dashboard counts at the **item level** (each pilot × currency cell), not at the pilot level — one pilot with three cautions counts three, not one. This is intentional (Phase-0 audit §2.5).

### CBTA competency grading

ICAO Doc 9868 PANS-TRG defines **8 core competencies** (encoded in `competency.ts`): Application of Procedures · Communication · Aeroplane Flight Path Management (Automation) · Aeroplane Flight Path Management (Manual Control) · Leadership & Teamwork · Problem Solving & Decision Making · Situation Awareness · Workload Management.

The prototype mapped each exercise to a single competency via regex heuristic. **That is wrong.** Production grades all 8 competencies per exercise via observable behaviours. The session UI implements this; the radar chart aggregates across multi-competency exercises; operators can mark a competency `NOT_OBSERVED` for a given exercise where genuinely not observable.

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
8. **stdout JSON logging** today; `AuditEvent ASSESSMENT_GENERATED` emission lands with the API service.

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

| Sprint | Weeks | Goal                                                                                                       | Status                          |
| ------ | ----- | ---------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1      | 1–2   | Foundation — monorepo, `@dnca/domain`, Postgres schema, RLS, audit triggers, one tenant.                   | **Done**                        |
| 2      | 3–4   | UI port — dashboard, pilots, sessions, aircraft, compliance pages; missing currency kinds added.           | **Done**                        |
| 3      | 5–6   | Hardening — RBAC, KCAA exports, document version control, notification engine.                             | KCAA exports shipped; rest WIP. |
| 4      | 7–8   | Domain depth — schema-validated AI **(done early)**, proper multi-competency CBTA, citation engine, per-operator config. | AI done; CBTA + citations WIP.  |
| 5      | 9–10  | Production readiness — multi-tenant cutover, demo env, deployment automation, observability, security review, ODPC registration. | Demo deploy on Vercel; rest queued. |

Each sprint ends with a deployable build and a demo to Capt. Ng'ong'a.

---

## Things to avoid

- **Don't reintroduce 2018 regulations.** They are repealed.
- **Don't reintroduce FORDEC.** T-DODAR is the standard.
- **Don't use `localStorage` for real data.** Browser storage is for the prototype only.
- **Don't generate fake/illustrative aviation facts.** If unsure about an F70 system detail, stop and ask. The product's credibility rests on technical accuracy.
- **Don't bypass the audit log.** Every state change must be recorded. No "internal" writes that skip it.
- **Don't store real pilot data in test or demo environments.** Demo fixtures only (Capt. Alpha One / F/O Bravo Two pattern).
- **Don't duplicate aviation facts.** Import `F70_100_PROFILE` (or `AIRCRAFT_FACTS`) from `@dnca/domain`. A fact in two places will drift.
- **Don't drop `.js` import extensions.** ESM + tsx + node:test all require them.
- **Don't anchor anything to a specific year or named CAA-AC document without checking** whether it's been superseded. KCAA Advisory Circulars at 2018 vintage are subordinate to KCARs 2025.
- **Don't add a second backend app on a whim.** The Fastify/NestJS decision is still open; the Next.js Route Handler interim is intentional.

---

## Open questions

Resolved decisions have moved to ADRs above. Still open, to be decided as work progresses (not blockers):

1. **Grading scale alignment** — keep AS/S/MS/BS or align to ICAO Doc 9868 1–5? Operator-by-operator or platform-wide? (Postgres carries both enums and a `grade_scale` discriminator today.)
2. **Backend service framework** — Fastify (lean) vs NestJS (structured). Defer until Sprint 4 calls for it.
3. **Auth provider** — WorkOS vs Clerk; magic-link fallback for operators without SSO.
4. **Hosting region** — AWS `af-south-1` (preferred per `docs/deployment/`) vs Azure South Africa North (fallback).
5. **CBTA grading granularity UX** — confirm the per-exercise multi-competency grading interaction model.
6. **Notification channels** — email-only initially, or also SMS via Africa's Talking (popular Kenyan provider)?
7. **Languages** — English only initially? Kiswahili in scope? French (for non-Kenyan East African operators)?

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
- `docs/architecture/adr/` — accepted ADRs
- `docs/audit/prototype-audit.md` — Phase-0 audit against project objectives
- `docs/demo/walkthrough.md` — 10-minute prospective-operator demo script
- `docs/deployment/README.md` — Vercel-demo + AWS-production deployment guide

When adding a new architectural decision, write an ADR in `docs/architecture/adr/NNNN-title.md` and add it to the index in that directory's README.

---

_This file is the source of truth for Claude Code working in this repository. Update it when project direction changes; do not let it drift from reality._

_Last updated: 27 May 2026 — reflects Sprint 1–3 shipped state (monorepo, RLS, audit triggers, three KCAA exports, AI assessment route, six accepted ADRs)._

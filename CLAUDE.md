# CLAUDE.md

**Instructions for Claude Code agents working in this repository.**

This file gives you the context to be genuinely useful on this codebase. Read it fully before making changes. If anything contradicts what a user instructs in-session, the user's instruction wins — but flag the contradiction so they can correct the file.

---

## What this project is

A production-grade multi-tenant platform for **Fokker 70/100 flight crew training management** operated by **DN Consultancy Aviation** (DNCA) for East African AOC holders. Principal stakeholder is **Capt. Dan Moi Ng'ong'a**, TRI/TRE Fokker 70/100.

Active operator deployments target: Jubba Airways Kenya (JAK) and I-Fly Air Solutions.

The platform is the software layer of a **forward-deployed engineering** consultancy model (Palantir-inspired). It is not a generic SaaS. Each operator deployment is bespoke configuration on top of reusable platform primitives.

A working **prototype** lives under `/prototype/` as a single-file React artifact. Treat it as a frozen specification of the intended UX and data model. Production rebuild should preserve its conceptual integrity while replacing browser-local storage with proper backend infrastructure.

---

## Your role

You are working alongside Capt. Dan Ng'ong'a, who is the domain expert and product owner. Capt. Ng'ong'a has deep aviation regulatory knowledge but is not a full-time software engineer. Your job:

1. **Implement the platform** to the specifications below
2. **Flag domain-critical decisions** — e.g., anything that affects what data a KCAA inspector would see, retention obligations, or audit trails — before making them autonomously
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
- **Reg 56(2)** — FDAP mandatory for aircraft >27,000 kg MTOW (both F70 and F100 qualify)
- **Reg 84** — 12-month transition deadline ~06 March 2027 unless extended by Cabinet Secretary
- **2018 regulations are repealed.** KCAA Advisory Circulars remain at 2018 vintage as subordinate guidance only. Where AC and KCARs 2025 conflict, the regulation prevails. Never anchor new code or content to the 2018 regulations.

### Decision framework

- **T-DODAR** (Time / Diagnose / Options / Decide / Act-Allocate / Review) is the standard across all JAK and I-Fly training and operational documentation. It **supersedes** any earlier reference to FORDEC. Never reintroduce FORDEC.

### Data and retention

- Training records retention: **5-year minimum** per KCARs; some items lifetime of licence
- FDR post-event retention: **60 days** (reg 18(3)(i))
- **Kenya Data Protection Act 2019** applies — DNCA is the data controller; registration with the Office of the Data Protection Commissioner is required; breach notification within 72 hours

---

## Architecture and tech stack

### Target stack

- **Frontend:** Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, Recharts, lucide-react
- **Backend:** Node.js / TypeScript on Fastify (lean) or NestJS (structured) — Capt. Ng'ong'a's preference TBD; default to Fastify unless instructed otherwise
- **Database:** PostgreSQL 15+ with row-level security for multi-tenancy
- **Auth:** WorkOS or Clerk; magic-link fallback
- **Audit log:** append-only Postgres table with `BEFORE UPDATE/DELETE` triggers that reject mutation
- **AI:** Anthropic Claude API. Default model `claude-sonnet-4-5` for assessment generation; consider Opus-class for document drafting
- **Object storage:** S3-compatible
- **Hosting:** AWS af-south-1 (Cape Town) or Azure South Africa North — data residency matters
- **Observability:** OpenTelemetry; Grafana Cloud or Datadog
- **CI/CD:** GitHub Actions with manual production promotion gate

### Multi-tenancy

- Single Postgres cluster, one schema, all tables tenant-scoped via `operator_id` column
- Row-level security policies enforce isolation
- Every API request resolves operator from auth claims before any query
- Audit log tagged with operator_id; cross-tenant queries restricted to platform-admin role

### Core data model

Preserve these entities and relationships from the prototype:

```
Operator (1) ──┬── Fleet (M)
               ├── Aircraft (M)             # per-registration data
               ├── Pilot (M)
               ├── Document (M)             # OM-A/B/C/D, training programmes
               └── User (M)                 # auth subjects

Pilot (1) ──┬── Currency (M)                # 14+ tracked items
            ├── Session (M)
            └── AssessmentResult (M)

Session (1) ──┬── Exercise (M)
              ├── Grade (1, overall)
              ├── SignOff (1, by TRI/TRE)
              └── DebriefNote (1)

Exercise (M) ──── Competency (M)            # CBTA: 8 ICAO competencies, M:M

AuditEvent ──── all of the above            # immutable, append-only
```

Currency items to track (from the prototype, plus additions identified in audit):

Personal: Class 1 Medical, ATPL/CPL, ELP Level, Passport/Visa
Type: F70/100 Type Rating, OPC, LPC
Operational: Line Check, Recurrent Ground, CRM/TEM, Dangerous Goods, Aviation Security, **Aerodrome Qualification (captain category)**, **Route Qualification**, **PIC Recency (90-day, 3 landings)**
Safety: SEP (Wet/Dry)
Special: RVSM, EGPWS/TAWS, Windshear/UPRT, **Cat II/III currency (separate)**, **Crew Pairing eligibility**

### Audit logging

Every state change writes an `AuditEvent`:

- `id` (uuid), `operator_id`, `actor_user_id`, `actor_role`, `entity_type`, `entity_id`, `action` (enum: CREATE/UPDATE/DELETE/SIGN_OFF/EXPORT), `before_state` (jsonb), `after_state` (jsonb), `occurred_at`, `request_id`, `ip_address`

`AuditEvent` rows are immutable. Postgres triggers reject UPDATE and DELETE on the table.

KCAA inspectors must be able to reconstruct the full history of any record. This is non-negotiable.

### Exports

KCAA-aligned export formats are first-class:

- **Crew Currency Snapshot** — operator-wide, point-in-time, PDF
- **Pilot Training File** — per-pilot, complete history, PDF + CSV
- **Session Report** — per-session, KCAA-presentation format (already in prototype)
- **Compliance Evidence Pack** — for KCAA audit; bundles relevant manuals, training records, currency snapshots
- **OM Cross-Reference Matrix** — LN 42/2026 Third Schedule clause → manual section → evidence

Default to **PDF** for inspector-facing exports. Provide CSV/JSON as developer-facing alternatives.

---

## Coding conventions

### General

- **TypeScript everywhere.** No JavaScript except in build tooling.
- **Strict mode on.** No `any` without `// TODO(claude): why any?` and a follow-up issue.
- **Prefer composition over inheritance.** Functional components, hooks, plain functions.
- **Pure where possible.** Side-effects at the edges.
- **Names are domain-aligned.** `pilot.medicalExpiry`, not `pilot.med_exp`. Spell out aviation terms: `proficiencyCheck`, not `pc`.

### Frontend

- Tailwind utility classes only — no custom CSS unless tooling-required (e.g., print stylesheets)
- Component co-location: each route module owns its components in `app/<route>/_components/`
- Shared components in `packages/ui/`
- Server Components by default; Client Components only when interactivity demands it
- Data fetching via React Server Components + tRPC or direct API; avoid client-side fetch for first paint
- **No `localStorage` or `sessionStorage` for application data.** All state goes to the backend.

### Backend

- Routes organised by domain entity (`/api/pilots`, `/api/sessions`, etc.)
- Service layer separates HTTP concerns from business logic
- Repositories wrap DB access; no raw SQL in handlers except for performance-critical paths
- Migrations via `drizzle-kit` or `node-pg-migrate` (decide in Sprint 1; document the choice)
- Every mutation route emits an `AuditEvent` — enforced by middleware, not by hope

### Testing

- **Unit tests** for pure logic (`vitest` or `node:test`)
- **Integration tests** against a test Postgres (Testcontainers)
- **End-to-end tests** for critical user journeys (Playwright)
- Critical journeys to cover: pilot creation, session logging, sign-off, export generation, expiry notification, audit log integrity

### Security

- All routes authenticated by default; explicit opt-out for the small set of public endpoints
- Authorisation checks at the service layer, not just the route layer — defence in depth
- Input validation via `zod` schemas at API boundary
- Output encoding by default in templates; HTML-escape user-supplied text in PDF generation (prototype has an open XSS surface in `printSessionReport` — fix this in the rebuild)
- Rate limiting on auth endpoints and AI proxy endpoints
- Secrets in environment, never committed; `.env.example` documents the shape

### Errors and observability

- Structured logging (JSON to stdout); correlation IDs propagated
- User-facing error messages are non-leaky; internal stack traces only to ops dashboards
- AI calls always wrap in try/catch with timeout + retry; never let an Anthropic API blip take down a page

---

## Domain-specific implementation notes

### Currency calculations

A currency item has: `valid_from`, `valid_to` (computed from `valid_from` + cycle months), `status` (CURRENT / CAUTION / ACTION / EXPIRED / NOT_APPLICABLE).

Status thresholds:

- Current: > 90 days to expiry
- Caution: 31–90 days
- Action: 1–30 days
- Expired: ≤ 0 days
- N/A: in-training pilots without yet a valid date

**Note from audit:** the prototype incorrectly shows medical/licence as "N/A" for in-training pilots. Medical and licence are required regardless of training phase. Only type-rating-derivative currencies (OPC, LPC, Line Check, Recurrent Ground) are N/A during ITR.

### CBTA competency grading

ICAO Doc 9868 PANS-TRG defines **8 core competencies**: Application of Procedures · Communication · Aeroplane Flight Path Management (Automation) · Aeroplane Flight Path Management (Manual Control) · Leadership & Teamwork · Problem Solving & Decision Making · Situation Awareness · Workload Management.

The prototype uses a **regex heuristic** mapping each exercise to a single competency. **This is wrong** — real CBTA grades all 8 competencies per exercise via observable behaviours. The production rebuild must:

1. Provide a per-exercise multi-competency grading UI
2. Each competency graded on AS/S/MS/BS (or aligned ICAO scale — see open question below)
3. Radar chart aggregates correctly across multi-competency exercises
4. Allow operator to mark a competency as N/A for a given exercise where genuinely not observable

### Stabilised approach gate

The prototype hardcodes "JAK/I-Fly: stabilised by 1,000 ft AAL IMC / 500 ft AAL VMC."

In reality, LN 42/2026 §2.1.25 does **not** specify gate heights — operators have submission flexibility. Per-operator configuration is required. Gate values live in the Operator's OM-A and must be configurable in the platform.

### KCAA submission flow

Reg 17(3) demands 30 days lead time. The platform should:

1. Allow draft documents to be prepared
2. Calculate submission deadline based on planned implementation date (implementation_date - 30 days)
3. Generate the KCAA transmittal letter automatically
4. Lock the document version on submission; subsequent changes create a new version
5. Track approval status (Submitted / Under Review / Approved / Returned for Revision)

### Document version control

Manuals are versioned per page, not per document. Each page carries last-revision date, revision status, and a Letter of Effective Pages (LEP) is auto-generated.

Diff view for revisions is highly valued by Heads of Training — they need to know what changed since the last approved version.

---

## AI integration

### Assessment generation (existing in prototype)

5-question MCQ generation for any topic, calibrated to F70/100 type-rated pilots. The prototype prompt is in the prototype source under `generateAssessment`. Production version must:

1. **Validate response against a JSON Schema** before returning to client (use `zod` or `ajv`)
2. **Retry on parse failure** up to 2 times before surfacing error
3. **Rate-limit per user** to prevent abuse
4. **Log every generation** with prompt + response to `AuditEvent` (assessment_generated event)
5. **Never include real pilot PII** in prompts to the AI

### Document drafting workflows (future)

Future capability: AI-assisted drafting of OM amendments, training programme updates, KCAA submission cover letters. Use Claude (Opus-class for drafting). Always human-in-the-loop — AI output is a draft, never auto-submitted.

### Model selection

- Assessment generation: `claude-sonnet-4-5` (fast, cheap, capable enough)
- Document drafting: `claude-opus-4-7` (when latency tolerable)
- Routine summarisation: `claude-haiku-4-5`

Pin model strings; do not rely on aliases. Version pinning is part of the audit trail.

---

## Build sequence (10 weeks)

| Sprint | Weeks | Goal                                                                                                                             |
| ------ | ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1      | 1–2   | Foundation — backend skeleton, Postgres schema, auth, audit logging, one tenant. Port data model from `/prototype/` verbatim.    |
| 2      | 3–4   | UI port — replace browser-local with API calls. Add missing currency types.                                                      |
| 3      | 5–6   | Hardening — RBAC, KCAA exports, document version control, notification engine.                                                   |
| 4      | 7–8   | Domain depth — schema-validated AI, proper multi-competency CBTA, citation engine, per-operator config.                          |
| 5      | 9–10  | Production readiness — multi-tenant cutover, demo env, deployment automation, observability, security review, ODPC registration. |

Each sprint ends with a deployable build and a demo to Capt. Ng'ong'a.

---

## Things to avoid

- **Don't reintroduce 2018 regulations.** They are repealed.
- **Don't reintroduce FORDEC.** T-DODAR is the standard.
- **Don't use `localStorage` for real data.** Browser storage is for the prototype only.
- **Don't generate fake/illustrative aviation facts.** If unsure about an F70 system detail, stop and ask. The product's credibility rests on technical accuracy.
- **Don't bypass the audit log.** Every state change must be recorded. No "internal" writes that skip it.
- **Don't store real pilot data in test or demo environments.** Generalised demo data only (Capt. Alpha One, F/O Bravo Two pattern from the prototype).
- **Don't anchor anything to a specific year or named CAA-AC document without checking** whether it's been superseded since the cutoff. KCAA Advisory Circulars at 2018 vintage are subordinate to KCARs 2025.

---

## Open questions for Capt. Ng'ong'a

To raise as the work progresses, not to block on:

1. **Grading scale alignment** — keep AS/S/MS/BS or align to ICAO Doc 9868 1–5? Operator-by-operator or platform-wide?
2. **Fastify vs NestJS** for the backend.
3. **WorkOS vs Clerk** for auth.
4. **AWS af-south-1 vs Azure South Africa North** for hosting.
5. **CBTA grading granularity** — confirm desired UX for per-exercise multi-competency grading.
6. **Notification channels** — email only, or also SMS via Africa's Talking (popular Kenyan provider)?
7. **Languages** — English only initially? Kiswahili in scope? French (for non-Kenyan East African operators)?

---

## Working with Capt. Ng'ong'a

A few practical notes that will make collaboration smooth:

- He frequently writes "your call" or "go for it" — proceed autonomously, flag major decisions after
- He grades work on a 1–10 scale; he targets 9–10/10; ratings below 7 trigger rebuild with source review
- He prefers dense, complete responses over many small ones
- He values factual accuracy from source documents over generic patterns
- He has the regulatory documents — when you need a primary source, ask him to share rather than guessing
- He has been working with another AI through the chat interface to build this prototype; conversation continuity is important. If something looks like it contradicts an earlier decision, ask before changing.
- DN Consultancy brand colours: navy and amber; Jetways brand colours: navy and blue (for any Jetways-derivative work). Default to DNCA palette here.

---

## Reference materials in this repo

- `/prototype/` — the original single-file React artifact (frozen reference)
- `/docs/regulatory/` — primary regulatory source PDFs (KCARs LNs, ICAO docs, FAA ACs, EASA AMC)
- `/docs/architecture/` — ADRs, sequence diagrams, data model
- `/docs/deployment/` — per-operator deployment playbooks (Phase 0/1/2 templates)
- `/docs/audit/` — KCAA audit-readiness checklists

When adding a new architectural decision, write an ADR in `/docs/architecture/adr/NNNN-title.md`.

---

_This file is the source of truth for Claude Code working in this repository. Update it when project direction changes; do not let it drift from reality._

_Last updated: 24 May 2026 — initial production rebuild kick-off._

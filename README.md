# DNCA Flight Crew Training Platform

**Forward-deployed regulatory engineering and crew training management for East African AOC holders.**

A multi-tenant platform combining crew currency tracking, training programme management, instructor session logging, CBTA analytics, regulatory document control, and AI-assisted knowledge assessment — anchored to KCARs 2025 with ICAO / FAA / EASA cross-reference.

The platform is **aircraft-type-agnostic at the spine, type-specific by deployment** (ADR 0006). Fokker 70/100 is the production-ready primary calibration (demoed against I-Fly Air Solutions); Boeing 737NG is the preview profile (demoed against Jubba Airways Kenya); extending to ATR 72, E170, E190 et al. is a content task during Phase-1 of each operator deployment, not an engineering change.

Built and operated by **DN Consultancy Aviation** under the principal direction of **Capt. Dan Moi Ng'ong'a**, TRI/TRE Fokker 70/100.

---

## Status

**Phase:** Production rebuild from working prototype; first prospective-operator demo ready.

The prototype (single-file React artifact) is committed under `/prototype/` for reference. This repository is the productionisation: typed domain primitives, Postgres schema with row-level security and append-only audit log, KCAA-aligned export formats (Crew Currency Snapshot + OM Cross-Reference Matrix shipped; Pilot Training File queued), AI-assisted assessment generation with citation anchoring and prompt versioning, and full Kenya Data Protection Act 2019 readiness in the data layer.

For a 10-minute prospective-operator demo walkthrough see [`docs/demo/walkthrough.md`](./docs/demo/walkthrough.md).
For deployment guidance (Vercel for demo, AWS `af-south-1` for production) see [`docs/deployment/README.md`](./docs/deployment/README.md).

---

## Why this exists

KCARs 2025 (Legal Notices 29, 30, 31, 37, 40, 41, 42 of 2026) is binding Kenyan law. The Third Schedule of LN 42/2026 is the new operator's manual content list. **Reg 84 grants a 12-month transition window with a deadline of approximately 06 March 2027.**

Every F70/100 operator in Kenya currently holds manuals citing a repealed 2018 framework. This platform supports the transition: it serves as the operator's training management system of record, and a structured surface across which the DN Consultancy Aviation deployment methodology executes.

The Fokker 70 and Fokker 100 both exceed the 27,000 kg MTOW threshold of Reg 56(2), so FDAP is mandatory. The platform is built with this in mind.

---

## Strategic positioning

DN Consultancy Aviation operates a **forward-deployed engineering** model (Palantir-inspired): each operator deployment is a bespoke configuration on top of reusable platform primitives. This repository is the platform spine.

**The four reusable primitives:**

1. **Regulatory ontology** — KCARs 2025 mapped to ICAO Annex 1/6/17/18, FAA 14 CFR Part 121/61/117/5, EASA Part-CAT/ORO/FCL. Every clause traceable.
2. **Document primitives** — OM-A/B/C/D framework, training programme templates, regulatory cross-reference matrix, document control conventions.
3. **Software primitives** — the data model (Operator → Fleet → Aircraft → Pilot → Currency → Session → Exercise → Competency → Grade → Sign-off → Document → Audit Event).
4. **Deployment methodology** — Phase 0 Discovery → Phase 1 Compliance Package → Phase 2 Platform Deployment → Phase 3 Continuous.

The discipline: every recurring pattern from each operator deployment extracts back to the platform. Without this, the model degenerates into bespoke maintenance.

---

## Target users

Per operator tenant:

- **Accountable Manager** — top-level dashboard, compliance posture, regulatory cliff visibility, audit-readiness
- **Head of Training / Chief Pilot** — training programmes, crew pipeline, TRI/TRE management, sign-offs
- **Safety Manager** — SMS-aligned reporting, FDAP exceedance trends, training-related occurrence reports
- **Quality / Compliance Monitoring Manager** — KCAA submission packs, audit-evidence export, document version control
- **TRI/TRE** — session logging, grading, debrief notes, sign-off, instructor standardisation
- **Line Training Captain / LCE** — LIFUS sector sign-off, line checks
- **Pilot** — read-only view of own currency, upcoming recurrent training, assessment history

---

## Tech stack (target)

- **Frontend:** Next.js 14+ (App Router) · React · TypeScript · Tailwind CSS · Recharts · lucide-react
- **Backend:** Node.js / TypeScript on Fastify or NestJS _(decide in Sprint 1)_
- **Database:** PostgreSQL 15+ with row-level security for multi-tenancy
- **Auth:** WorkOS or Clerk for SSO + RBAC; magic-link fallback for operators without SSO
- **Audit log:** append-only event store (Postgres table with immutability triggers, or EventStoreDB)
- **AI:** Anthropic Claude API (Sonnet 4 minimum) for assessment generation; consider Claude Opus 4.7 for document drafting workflows
- **Hosting:** AWS af-south-1 (Cape Town) or Azure South Africa North — for data residency in alignment with Kenya DPA 2019
- **Storage:** S3-compatible object store (operator documents, KCAA export PDFs)
- **Observability:** OpenTelemetry → Grafana Cloud or Datadog
- **CI/CD:** GitHub Actions; staging → production with manual promotion gate

---

## Repository layout (target)

```
/
├── apps/
│   ├── web/                    # Next.js frontend
│   └── api/                    # Backend API (Fastify/NestJS)
├── packages/
│   ├── ontology/               # Regulatory ontology (KCARs/ICAO/FAA/EASA cross-map)
│   ├── domain/                 # Shared TS types: Pilot, Currency, Session, etc.
│   ├── exports/                # KCAA-format PDF/CSV exporters
│   ├── prompts/                # Claude API prompt templates
│   └── ui/                     # Shared React components
├── prototype/                  # Original single-file React artifact (frozen reference)
├── docs/
│   ├── regulatory/             # Source LN PDFs, ICAO/FAA/EASA references
│   ├── architecture/           # ADRs, sequence diagrams, data model
│   ├── deployment/             # Per-operator deployment playbooks
│   └── audit/                  # KCAA audit-readiness checklists
├── infra/
│   ├── terraform/              # Cloud infrastructure as code
│   └── migrations/             # Postgres migrations
├── CLAUDE.md                   # Instructions for Claude Code agents
└── README.md                   # This file
```

---

## Build sequence

Ten-week plan to first paying-operator deployment readiness.

### Sprint 1 (weeks 1–2): Foundation

Backend skeleton, Postgres schema (single tenant for now), auth, audit logging, one operator tenant seeded. Port data model from `/prototype/` verbatim.

### Sprint 2 (weeks 3–4): UI port

Port prototype UI tab-by-tab. Replace browser-local storage with API calls. Add missing currency types: aerodrome qualification, route qualification, Cat II/III separate, PIC recency (90-day rule), recent landings, crew pairing, ELP Level, passport/visa.

### Sprint 3 (weeks 5–6): Hardening

RBAC enforcement, KCAA export formats (PDF + structured), document version control with diff view, notification engine (email/SMS for currency expiry, recurrent due, submission deadlines).

### Sprint 4 (weeks 7–8): Domain depth

AI assessment hardening with schema validation + retry; proper per-exercise multi-competency CBTA grading (replace prototype's regex heuristic); citation engine (every regulatory claim hyperlinks to source); per-operator configuration (stabilised approach gates, OpSpec parameters, fleet data).

### Sprint 5 (weeks 9–10): Production readiness

Multi-tenant cutover, demo environment, deployment automation, observability, security review, penetration test, Kenya ODPC registration as data controller.

---

## Critical F70/100 technical facts (preserve in all rebuilds)

- F70 and F100 both use **Rolls-Royce Tay Mk.620-15** engines
- APU: **AlliedSignal GTCP36-150-RR**
- **Three independent hydraulic systems** (not two)
- F70 standard: MTOW 37,995 kg / MLW 35,835 kg / MZFW 32,205 kg
- F70 HGW (5Y-MMB): MTOW 39,915 kg / MZFW 33,565 kg
- F100: MTOW 44,450 kg / MLW 38,780 kg / MZFW 35,830 kg
- Takeoff flap: **Flaps 0 default · Flaps 8 performance · Flaps 15 reserved · Flaps 0 PROHIBITED on contaminated runways**
- TOCWS does NOT alert for Flaps 0 (valid config) — EICAS confirmation discipline mandatory
- OEI technique: **PPAA** (Power / Pitch / Attitude / Airspeed) with **5° bank into live engine**
- Approach speeds: **VMA-based** from PFD (not paper speed cards)
- Grading scale: **AS / S / MS / BS** (operator convention; ICAO Doc 9868 PANS-TRG uses 1–5 — alignment is a Sprint 4 task)
- Max fuel asymmetry: 1,000 kg en-route
- Landing flap: 25 or 42
- Decision framework: **T-DODAR** (Time / Diagnose / Options / Decide / Act-Allocate / Review) — supersedes FORDEC

**FFS facility:** SimAero Dinard, France, FR-101 — **EASA Level C** (confirmed). ZFTT not available at Level C. Base training on actual aircraft is mandatory post-Skills Test per ICAO Doc 9868 §4.5.1.

---

## Regulatory framework

**Primary binding (Kenya):**

| Instrument | Subject                                                  | Effective   |
| ---------- | -------------------------------------------------------- | ----------- |
| LN 29/2026 | Operations — Aeroplanes                                  | 03 Mar 2026 |
| LN 30/2026 | SMS / ATS                                                | 03 Mar 2026 |
| LN 31/2026 | Aviation Security / PEL                                  | 03 Mar 2026 |
| LN 37/2026 | Airworthiness                                            | 03 Mar 2026 |
| LN 40/2026 | UAS                                                      | 03 Mar 2026 |
| LN 41/2026 | Aerodromes                                               | 03 Mar 2026 |
| LN 42/2026 | AOC & Administration (Third Schedule binding OM content) | 06 Mar 2026 |

**Key binding provisions:**

- Reg 17(3) — 30-day pre-implementation submission of manuals to KCAA
- Reg 32(3) and 38(3) — Human Factors statutory for checklist design
- Reg 56(2) — FDAP mandatory >27,000 kg MTOW (F70 and F100 qualify)
- Reg 18(3)(i) — FDR post-event retention 60 days
- Reg 84 — 12-month transition window (~06 March 2027)
- Sixth Schedule penalties — A-class up to KSh 1M / 1 year; B-class up to KSh 2M / 3 years

**Cross-referenced:** ICAO Annex 1 (Amdt 49), Annex 6 Part I, Annex 17, Annex 18; Doc 9868 PANS-TRG (3rd Ed 2020), Doc 9859 SMS, Doc 9683 HF, Doc 9966 FRMS · FAA 14 CFR Part 121, 61, 117, 5; AC 120-51E, 120-71B, 120-82 · EASA Part-CAT, Part-ORO, Part-FCL, CS-FSTD(A), AMC1 ORO.FC.220 / ORO.FC.230.

KCAA Advisory Circulars (CAA-AC-OPS022A, CAA-M-OPS022, etc.) remain at 2018 vintage and are subordinate guidance only. Where AC and KCARs 2025 conflict, the regulation prevails.

---

## Compliance and operational obligations

This platform stores regulated aviation records. The build and operations team must treat it accordingly.

- **5-year minimum retention** per KCARs for training records; some items lifetime of licence
- **Kenya Data Protection Act 2019** — registration as data controller with Office of the Data Protection Commissioner; data subject rights workflow; breach notification within 72 hours
- **Audit-grade logging** — every record change immutably logged with actor, timestamp, before/after state
- **KCAA inspector access** — operators must be able to produce evidence on demand; export formats prioritise paper/PDF over digital-only

Browser-local storage is acceptable only for the frozen prototype. Production data lives in Postgres with daily backups and documented retention.

---

## Commercial model

Engagement structure DNCA offers operators:

| Phase                         | Deliverable                                         | Duration   | Indicative Fee (USD) |
| ----------------------------- | --------------------------------------------------- | ---------- | -------------------- |
| Phase 0 — Discovery           | KCARs 2025 readiness audit + remediation roadmap    | 2 weeks    | 8,000 – 12,000       |
| Phase 1 — Compliance Package  | OM revision + training programmes + KCAA submission | 60–90 days | 65,000 – 110,000     |
| Phase 2 — Platform Deployment | This platform configured to operator                | Months 4–9 | 35,000 – 60,000      |
| Phase 3 — Continuous          | TRI/TRE services + reviews + KCAA liaison           | Ongoing    | 25,000 – 40,000 / yr |

Phase 0 fee credits against Phase 1 if Operator continues within 60 days.

---

## Active operator engagements

- **Jubba Airways Kenya (JAK)** — primary reference deployment; F70 fleet including 5Y-MMB (HGW variant)
- **I-Fly Air Solutions** — secondary reference deployment; F100 fleet

Reference calls require explicit written authorisation from each operator's Accountable Manager.

---

## Contact

**Capt. Dan Moi Ng'ong'a**
Principal, DN Consultancy Aviation
TRI/TRE Fokker 70/100

_Forward-deployed regulatory engineering for East African aviation._

---

## Licence

Proprietary. © DN Consultancy Aviation, 2026. All rights reserved.

This codebase is the property of DN Consultancy Aviation and is not licensed for redistribution. Operator deployments are governed by individual engagement contracts. Unauthorised reproduction or distribution is prohibited.

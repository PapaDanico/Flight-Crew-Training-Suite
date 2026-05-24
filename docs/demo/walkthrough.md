# 10-minute prospective-operator demo walkthrough

Target audience: Accountable Manager + Head of Training of a prospective operator (Kenyan AOC holder, F70/100 or other type). Goal: secure a Phase 0 Discovery engagement.

## Pre-flight

- `ANTHROPIC_API_KEY` set in `apps/web/.env.local` (so the AI generator works live, not as a static page).
- `pnpm install && pnpm --filter @dnca/web build && pnpm --filter @dnca/web start`.
- Open <http://localhost:3000> in a fresh browser tab.
- Have a printer (or PDF printer) ready for the export demo.

## The walk (10 min, no notes needed)

### 1. Dashboard `/` — 90 s

> "This is the Accountable Manager's view, end of each week. Top of the page is the regulatory cliff: LN 42/2026 effective March 2026, Reg 84 transition closes March 2027. Below: 4 stat cards showing item-level counts across every (pilot, currency) cell — not pilot-level rollups — because one pilot with three cautions counts three, not one. Distribution panels by fleet, by item-status, by pilot phase. Bottom of the page: Expiring Soon, sorted by days-to-expiry — exactly the list the HoT works against on Monday morning."

Talking points:

- "Live demo data is deterministic — same dataset every demo, refreshes the dates against today."
- "All numbers here flow through the same status function that protects the database write path. The dashboard cannot drift from the source of truth."

### 2. Currency Tracker `/pilots` — 90 s

> "The 23-item currency catalogue includes everything KCARs and the operator's OM-A require: medical, ATPL, ELP level, passport, type rating, OPC, LPC, line check, recurrent ground, CRM/TEM, dangerous goods, AVSEC, aerodrome qualification, route qualification, 90-day PIC recency, SEP wet/dry, RVSM, EGPWS, Windshear and UPRT separately, Cat II and Cat III separately, crew pairing eligibility."

> "Status colour is computed per cell. Yellow = caution (31–90 days). Red = action (≤30 days). Dark red = expired. Grey = N/A — and importantly N/A only applies to type-rating-derivatives during ITR. Medical and licence are never N/A regardless of training phase."

Per-operator "Snapshot" buttons top-right.

### 3. Pilot drill-down `/pilots/<id>` — 60 s

Click on **Capt. Charlie Three** (the I-Fly pilot with the expired medical).

> "One click in: the pilot's full record. Five stat cards. Currency grouped by category with valid-from, valid-to, and the source regulation cited per row. Recent sessions filtered to this pilot. Two of his items are expired today — visible immediately to anyone with the AM role."

Mention what's not yet here:

- "Assessment history slot is reserved — Sprint 4 wires it up when we have AssessmentResult persistence."
- "Pilot Training File PDF — Sprint 3 deliverable. Today the inspector can still download the operator snapshot."

### 4. KCAA snapshot export — 60 s

Click the **Snapshot — JAK Demo** button. Opens in a new tab.

> "This is what KCAA gets handed. Three pages, per-pilot grouped by currency category, status colour-coded. Cmd-P or Ctrl-P → Save as PDF, and the inspector has a paper record that matches the live dashboard exactly. No copy-paste between Excel and Word."

Demo the print preview if you want to make it land.

### 5. CBTA session record `/sessions` then click the OPC — 2 min

> "This is what the platform is actually FOR. A TRI/TRE runs a session — 5 exercises in this OPC — and grades EVERY ICAO competency on EVERY exercise. Not 'one competency per exercise' the way most training records work. ICAO Doc 9868 PANS-TRG mandates the 8-competency model because real performance is multidimensional."

Open F/O Bravo Two's OPC. Walk through:

- Sign-off block (signed by TRE)
- Debrief paragraph
- Per-exercise panels with the 8-competency grid
- Aggregate at the bottom: 5 exercises × 8 competencies = 40 grades

> "Last panel at the bottom: the radar-chart input. If a pilot's MS counts cluster on Workload Management across 5 exercises, that's where the next-recurrent focus goes. The data is already shaped for it."

### 6. AI assessment `/assessments` — 2 min

Pre-set the topic field to **"Engine failure on takeoff"** and the calibration target to **Type Recurrent / OPC prep**.

> "F70/100 is selected by default. Generate."

Wait ~8 seconds.

> "5 multiple-choice questions, citation-anchored. Each explanation references a primary source. Server-side proxy — Anthropic API key never reaches the browser. Schema-validated with two retries. Per-IP rate-limited. The prompt itself is versioned in source control; every generated assessment carries the prompt version and the model id, so an audit can reproduce any generation."

Show the metadata strip: model id, prompt version, attempt count, cache token-read count if visible.

Now click the **E190** type button.

> "Same platform. Different type. Click — and you see the preview banner: the operational technique and AI calibration haven't been populated by an E190 TRI/TRE yet, so the platform refuses to invent specifics. The prompt falls back to generic content. Phase 1 of an E190 deployment is the moment that TRI/TRE populates the profile and flips it to production-ready."

Generate one in E190 mode. Note the questions are noticeably more generic — and that's the point: **the platform never invents safety-relevant aviation facts**.

### 7. Aircraft + Compliance — 60 s

`/aircraft?typeId=F70_100`:

> "F70/100 facts page. Engine, APU, hydraulics, OEI technique, fuel asymmetry. FDAP-mandatory flag computed per variant from KCARs Reg 56(2) — the platform knows which of the operator's fleet must run FDAP."

Click the E190 button.

> "Same page, different profile. Preview banner. Operational facts say 'pending primary source' until a qualified instructor populates them."

`/compliance`:

> "9-domain cross-reference matrix: every domain mapped to its KCARs, ICAO, FAA, and EASA citations. Third Schedule structure. Sixth Schedule penalties. Every cell is a typed `Citation` from `@dnca/ontology` — same constants the AI prompt and the export use."

### 8. Close — 30 s

> "What you've seen is the live demo data. Phase 0 — Discovery — is two weeks: I audit your current OM and training programme against KCARs 2025, produce a remediation roadmap. Phase 1 — Compliance Package — is 60 to 90 days of OM revision and training programme drafting, plus the KCAA submission. Phase 2 — Platform Deployment — is months 4 through 9: this platform configured to your operator, your fleet, your pilots, your OpSpecs. Phase 3 is continuous: TRI/TRE services, reviews, KCAA liaison."

> "Phase 0 fee credits to Phase 1 if you continue within 60 days. Two weeks from today, you have a written assessment of where you stand."

## Anticipated questions

- **"Is our data secure?"** — Multi-tenant from day one. Postgres row-level security at the database boundary; an application bug can't leak across operators. Data stays in AWS af-south-1 (Cape Town) or Azure South Africa North for Kenya DPA 2019 residency.
- **"What if you're hit by a bus?"** — Every regulatory claim the platform makes is cited to a primary source you can verify. The audit log is append-only and immutable. Your data and your manuals are exportable at any point. The platform doesn't lock you in; the consulting service does the heavy lifting.
- **"Why F70/100? We fly something else."** — F70/100 is the first production-ready type calibration. The platform itself is type-agnostic — adding your type is a Phase 1 content task, not a code change. Embraer 190 is in preview today; ATR 72 and E170 are the next targets.
- **"What's it cost?"** — Phase 0: $8–12k. Phase 1: $65–110k. Phase 2: $35–60k. Phase 3: $25–40k/yr. Phase 0 credits to Phase 1.
- **"When can you start?"** — Phase 0 in two weeks. Soft-booked through Q3 2026; first hard slots available immediately for Reg 84 transition urgency.

## What to skip in the 10-minute version

- The Drizzle schema, RLS migration, audit triggers — show in a 30-minute technical deep-dive only.
- The ADRs — same.
- The Sessions DRAFT vs SIGNED_OFF distinction — only mention if the HoT asks how mid-session reviews work.

## What's NOT in the demo (yet) — be honest if asked

- Writes: the API + auth layer is gated on the framework/auth-provider decisions. Today's surface is read-only.
- Notifications: email expiry reminders are Sprint 3.
- KCAA submission letter auto-generation: Sprint 3.
- Document version diff view: Sprint 3.
- SMS notifications via Africa's Talking: post-MVP.

The pitch isn't "this is finished" — it's "this is the spine, calibrated to your aircraft type, and Phase 2 is where it becomes your system of record."

# Prototype Audit — Fokker 70/100 Flight Crew Training Suite

**Auditor:** Claude Code agent
**Date:** 24 May 2026
**Source under audit:** `prototype/App.jsx` (artifact `fe7eaec3-a6b5-4589-96da-d84f0790b69b`)
**Reference frame:** `README.md` (project objectives), `CLAUDE.md` (production specification), KCARs 2025 (LN 29–42 of 2026), ICAO Doc 9868 PANS-TRG, EASA Part-CAT / Part-ORO.

Severity tags: **[CRIT]** regulatory/safety/audit-trail blocker · **[IMP]** production blocker · **[REC]** improvement · **[VERIFY]** needs primary-source confirmation by Capt. Ng'ong'a.

---

## 1. Executive summary

The prototype is a credible single-file proof-of-concept that captures the **shape** of the platform — currency tracking, training programme display, knowledge library, AI-generated MCQ assessments, and a regulatory cross-reference table. Aviation domain content is largely accurate and shows clear TRI/TRE provenance.

It is **not** yet a regulated-records system. The biggest gaps are structural, not cosmetic:

- **No audit trail.** Every state change is a silent in-memory mutation persisted to browser storage. A KCAA inspector cannot reconstruct who changed what or when. This is the single largest gap against KCARs/DPA 2019 obligations.
- **No multi-tenancy, no auth, no RBAC.** A single React state tree holds both JAK and I-Fly pilots; any user can edit any pilot.
- **No CBTA primitives.** No Session / Exercise / Competency / Grade / Sign-off entities exist. The platform cannot yet hold a training record — only currency end-dates.
- **Anthropic API called from the browser.** Whatever key would be needed is necessarily exposed; there is no schema validation, retry, rate limit, audit log, or PII filter on the AI surface.
- **Several missing currencies** required by KCARs / operator OM-A (Aerodrome Qual, Route Qual, PIC Recency, ELP Level, Passport/Visa, Cat II/III separate, Crew Pairing eligibility).
- **One in-training-pilot logic bug** that conflicts with KCARs requirements (medical/licence are required regardless of ITR phase).
- **Hardcoded operator-specific values** (stabilised approach gates, fleet list, base list, operator names) that should be per-operator configuration.

The prototype's regulatory cross-reference table, knowledge library content, ITR/recurrent programme schedules, and assessment generation prompt show genuine domain depth and are largely worth preserving in the rebuild. The work item is to wire these into proper backend infrastructure rather than to rewrite them.

**Overall production-readiness score: 3/10.** Sound as a UX spec; not yet a system of record.

---

## 2. Findings — regulatory alignment

### 2.1 [CRIT] No audit trail for any state change

**Where:** All `setPilots(...)`, `updateCurrency`, `deletePilot`, `addPilot` calls.
**Why it matters:** Reg 17 / KCARs 2025 inspector workflow expects record provenance. Kenya DPA 2019 Article 41 requires controllers to maintain processing records.
**Fix:** Every mutation must emit `AuditEvent` (actor, timestamp, before/after, request_id, ip). See `CLAUDE.md` §"Audit logging". Enforce via Postgres trigger and API middleware, not by application discipline.

### 2.2 [CRIT] In-training pilots incorrectly marked N/A for medical and licence

**Where:** `addPilot` at the assignment of `acc[c.k]`:

```js
acc[c.k] = data.phase === 'ITR — Ground' || data.phase === 'ITR — FFS' ? '—' : offsetDate(c.m - 1);
```

This applies "—" to all currencies including Class 1 Medical and ATPL/CPL. Medical and licence are required to enter ground school — they cannot be N/A.
**Fix:** Only type-rating-derivative currencies (OPC, LPC, Line Check, Recurrent Ground, Type Rating) are N/A during ITR. The seed for F/O Brian Kipchoge correctly has medical/licence dates — the bug is the constructor.

### 2.3 [CRIT] Missing currencies required by KCARs / operator OM-A

The prototype tracks 14 items. The following are missing (CLAUDE.md §"Currency items to track"):

| Missing item                     | Source                               | Cycle                           | Category    |
| -------------------------------- | ------------------------------------ | ------------------------------- | ----------- |
| ELP Level                        | ICAO Annex 1 §1.2.9                  | 3 / 6 yr by level               | Personal    |
| Passport / Visa                  | Operator OM-A § crew docs            | per document                    | Personal    |
| Aerodrome Qualification          | KCARs Cat C aerodrome list           | 12-month or per familiarisation | Operational |
| Route Qualification              | LN 29/2026 Op procedures             | per OpSpec                      | Operational |
| PIC Recency (90-day, 3 landings) | ICAO Annex 6 Pt I 9.4.4 / FAA 61.57  | 90 days                         | Operational |
| Recent Landings (rolling)        | as above                             | —                               | Operational |
| Cat II/III currency              | ICAO Annex 6 9.4 / EASA Part-FCL.825 | 6-month or per OM-B             | Special     |
| Crew Pairing eligibility         | OM-A — both crew not low-experience  | per pairing                     | Special     |

### 2.4 [CRIT] Windshear and UPRT conflated into a single currency

**Where:** `windshearUprt` in `CURRENCIES`.
**Why it matters:** ICAO Annex 6 Amdt 43 / FAA 14 CFR 121.423 / EASA AMC1 ORO.FC.220 treat UPRT (Upset Prevention and Recovery Training) as a separate trainable competency. Conflating them obscures audit evidence.
**Fix:** Two items: `windshear` (predictive/reactive) and `uprt` (upset recovery + manual handling).

### 2.5 [IMP] Stabilised approach gate is hardcoded across operators

**Where:** Knowledge library §`ops` > "Stabilised Approach Gate": _"JAK/I-Fly: stabilised by 1,000 ft AAL IMC / 500 ft AAL VMC."_
**Why it matters:** LN 42/2026 §2.1.25 does NOT prescribe gate heights — operators have submission flexibility. Hardcoding mis-represents the regulation and forecloses an OpSpec-level configuration that operators need to vary.
**Fix:** Gate heights belong in the Operator's OM-A and must surface from a per-operator config table.

### 2.6 [IMP] Knowledge library does not surface the LN 42/2026 Third Schedule structure

**Where:** Compliance tab cross-reference table.
**Why it matters:** §2.1 of the Third Schedule has **34 OM content clauses**; §2.2 has **12 mandatory training topics**. These are the spine against which an operator's OM and training programme are audited. Without surfacing them, the operator cannot self-assess submission readiness.
**Fix:** Add a dedicated Third Schedule § matrix: clause → OM section reference → evidence link → submission status. This is also the Sprint 4 "OM Cross-Reference Matrix" export.

### 2.7 [REC] "Fatigue Management — Pending KCARs" understates current coverage

**Where:** Compliance tab.
**Why it matters:** Fatigue / FRMS is partially covered under LN 30/2026 (SMS) and via Annex 6 §4.10 + ICAO Doc 9966. Calling it "pending" is misleading.
**Fix:** Reference LN 30/2026 + Doc 9966 + FAA Part 117 + EASA ORO.FTL. Flag operator-specific FRMS rollout as the action item, not regulatory gap.

### 2.8 [REC] Penalty schedule omits operational consequences

**Where:** Compliance tab penalty box.
**Why it matters:** Beyond fines, a Sixth Schedule B-class offence can be grounds for AOC enforcement action. This is the bigger commercial risk.
**Fix:** Add a "consequences" line beyond fines (AOC suspension/revocation exposure, individual licence action).

---

## 3. Findings — F70/100 technical accuracy

### 3.1 [VERIFY] RR Tay Mk.620-15 described as "FADEC-controlled"

**Where:** Knowledge library §systems > "Powerplant".
**Why it matters:** The Tay 620 series uses an EEC / supervisory electronic control with a hydromechanical fuel control — it is commonly debated whether this qualifies as "FADEC" in the modern sense (full authority) or supervisory. Per CLAUDE.md's "stop and ask" rule for F70 system detail.
**Action:** Confirm with Capt. Ng'ong'a / RR Tay Maintenance Manual whether the platform should describe the engine as FADEC, supervisory EEC, or PMC-controlled.

### 3.2 [REC] Hydraulic architecture is correct but generic

**Where:** Knowledge library §systems > "Hydraulics".
**Why it matters:** "Three independent" is accurate (CLAUDE.md confirms). The description "PTU cross-supply" is correct but the platform should also surface: system numbering (1/2/3), which surfaces each powers, and the specific dual-loss configuration alert. F70/100 candidates need this granularity in ground school content.
**Fix:** Expand into a dedicated System 1/2/3 sub-page with services-powered matrix and electric-standby pump nomenclature.

### 3.3 [REC] Flap detents listed correctly; cross-reference to landing flap missing

**Where:** Knowledge library §systems > "Flight Controls" lists "Flap config: 0 / 8 / 15 / 25 / 42". CLAUDE.md §"Critical F70/100 technical facts" confirms 25 and 42 are landing flap selections.
**Improvement:** Tag landing flap selections (25, 42) and takeoff flap selections (0, 8, 15) distinctly so the library teaches the distinction.

### 3.4 [REC] Max fuel asymmetry 1,000 kg en-route is in CLAUDE.md but not in the library

**Where:** Knowledge library §systems > "Fuel System" defers to QRH.
**Fix:** Add the 1,000 kg limit explicitly with citation, and surface it in the AI assessment prompt knowledge anchor.

### 3.5 [REC] No content on AlliedSignal GTCP36-150-RR APU beyond a single-line description

**Where:** Knowledge library §systems > "APU".
**Fix:** Expand with operating envelope, bleed/electric supply modes, and known fault modes — this is recurrent ground material.

### 3.6 [REC] OEI section omits 5° bank as a written technique anchor

**Where:** Knowledge library §safety > "Engine Failure / Fire" — PPAA mnemonic present, but the "5° bank into the live engine" is not explicitly stated in the library text (it is in the AI prompt and CLAUDE.md).
**Fix:** Inline the 5° bank rule into the library content.

### 3.7 [REC] No coverage of TOCWS limitations or EICAS confirmation discipline

**Where:** CLAUDE.md flags this as safety-significant: _"TOCWS does NOT alert for Flaps 0 (valid config) — EICAS confirmation discipline mandatory."_
**Fix:** Library §systems should have a dedicated "Takeoff Configuration Warning System (TOCWS) & EICAS discipline" page.

### 3.8 [REC] VMA explained but not the additives policy

**Where:** Knowledge library §systems > "Avionics — VMA Speed System".
**Fix:** Specify how VMA computes Vref + additives (gust, ice, configuration) and what the PM cross-check is.

### 3.9 [REC] Decision framework section names T-DODAR correctly; supersession of FORDEC not flagged

**Where:** Library §crm > "T-DODAR Decision Framework".
**Improvement:** Add a one-line "supersedes FORDEC" note so legacy references don't sneak back in — CLAUDE.md treats this as a hard prohibition.

---

## 4. Findings — data model completeness

### 4.1 [CRIT] No Session / Exercise / Competency / Grade / Sign-off / DebriefNote entities

**Where:** Data model is `pilots: [{ currencies: {...} }]` — flat.
**Why it matters:** Without these, the platform cannot store a single training session record, cannot grade CBTA competencies, cannot produce a Pilot Training File, cannot sign off LIFUS sectors, and cannot evidence recurrent currency. This is the missing core of a training-records system.
**Fix:** Implement the entity tree exactly as `CLAUDE.md` §"Core data model" specifies. This is Sprint 1 / 2 work.

### 4.2 [CRIT] No Operator entity (despite an `OPERATORS` constant)

**Where:** `OPERATORS = ["JAK", "I-Fly"]` is a string array, not a tenant.
**Why it matters:** Multi-tenancy with RLS depends on `operator_id` foreign keys. The string-typing also prevents per-operator config (gates, OpSpecs, fleet customisation).
**Fix:** Operator becomes a first-class entity with id, name, AOC number, country (KE), DPA controller registration #, OpSpec config, branding, contact, status.

### 4.3 [CRIT] No Document entity for OM-A/B/C/D and training programmes

**Why it matters:** Document version control and Reg 17(3) submission flow depend on this.
**Fix:** Document, DocumentVersion, DocumentPage, LetterOfEffectivePages, KCAASubmission, ApprovalStatus — see CLAUDE.md §"Document version control" and §"KCAA submission flow".

### 4.4 [CRIT] No User / Role entity

**Why it matters:** RBAC needs roles. Accountable Manager, HoT, Safety Manager, Quality, TRI/TRE, LCE, Pilot — each has a defined view and write surface.
**Fix:** User + RoleAssignment (a User can have different roles per Operator for instructors who serve multiple operators).

### 4.5 [IMP] Pilot fields underspecified vs operational needs

Missing on Pilot: date of birth (age limits per ICAO Annex 1 §2.1.10), gender (statutory reporting), employee ID, hire date, total hours, type hours, PIC hours, last sim date, last line check, base assignment history, emergency contact.

### 4.6 [IMP] Currency model is value-only (date), not relational

Each currency should reference: source training Session (where applicable), instructor (where applicable), notes, attachments. Today the prototype stores only `valid_to`.

### 4.7 [REC] Fleet, Aircraft (per-registration) entities absent

**Why it matters:** 5Y-MMB is an HGW variant with different MTOW/MZFW. Aircraft-specific currency (e.g. landing currency on specific registration if operator policy demands) cannot be modelled.
**Fix:** Fleet (type-level) → Aircraft (registration-level) with HGW/standard flag and live mass limits.

---

## 5. Findings — security & compliance

### 5.1 [CRIT] `window.storage` used as the only persistence layer

**Where:** All `useEffect` hooks reading/writing `window.storage`.
**Why it matters:** KCARs training-records retention is 5 years minimum; some items lifetime of licence. Browser storage is ephemeral, unbacked, and cleared on cache clear or device change. **A single browser cache flush destroys the operator's training records.** This is a non-starter for regulated use.
**Fix:** Hard rule from CLAUDE.md: no browser storage for application data. All state lives in Postgres with daily backup and documented retention.

### 5.2 [CRIT] Anthropic API called directly from the browser

**Where:** `generateAssessment` issues `fetch("https://api.anthropic.com/v1/messages", ...)` with no Authorization header (which means it will fail in real use unless a key is browser-exposed).
**Why it matters:** (a) any key embedded is exfiltratable; (b) no rate limit allows abuse against the operator's billing; (c) no audit of generated content; (d) no schema validation — JSON parse failure surfaces as `alert("Failed to generate questions")`; (e) no PII filter — if a future iteration includes pilot names in prompts, they leak to the model provider.
**Fix:** Proxy through backend `/api/ai/assessments` with:

- Server-side key
- Per-user rate limit (e.g. 10/hr/user)
- `zod` schema validation against the MCQ shape; up-to-2 retries on parse failure
- AuditEvent (`action: ASSESSMENT_GENERATED`) with prompt + response stored
- Outbound PII filter (no pilot identifiers in prompt)

### 5.3 [CRIT] Pinned to a legacy model identifier

**Where:** `model: "claude-sonnet-4-20250514"`.
**Why it matters:** This is a deprecated model id. CLAUDE.md prescribes pinning a current model (`claude-sonnet-4-5` per the document; per the current environment, this should be the latest Sonnet 4.x). Pinned model identifiers are also part of the audit trail.
**Fix:** Use the latest current model id; pin per environment; update via ADR when versions change.

### 5.4 [CRIT] XSS surface in any string interpolation rendered as innerHTML or PDF

**Why it matters:** CLAUDE.md flags an open XSS surface in `printSessionReport` (in a related/earlier prototype not in this file). The principle applies broadly: user-supplied text (debrief notes, pilot names, free-form fields) must be HTML-escaped before rendering in PDF/print contexts.
**Fix:** Default-escape via React (already does this for JSX), but explicitly escape for any future PDF generation (e.g. via `escape-html` or templated SSR with auto-escape).

### 5.5 [CRIT] `confirm()` / `alert()` for destructive operations

**Where:** `deletePilot` uses `confirm("Remove this pilot record?")`.
**Why it matters:** Browser-level dialogs leave no audit trail, no actor capture, no reason field. Deletes against a regulated record must be soft (mark inactive), reasoned, and signed off.
**Fix:** Soft-delete with `deleted_at`, `deleted_by`, `deletion_reason`. Hard delete restricted to platform-admin with secondary approval. AuditEvent regardless.

### 5.6 [IMP] No CSP, no auth, no CORS scoping

Out of scope for a prototype, in scope for Sprint 1.

### 5.7 [IMP] Kenya DPA 2019 obligations not surfaced

**Where:** No DPA-related UI exists.
**Why it matters:** DNCA is the controller; pilots are data subjects; rights include access, rectification, erasure (subject to KCARs retention overrides), portability. The platform needs a data-subject-request workflow and breach notification trigger.
**Fix:** Sprint 5 — ODPC registration page, subject-rights workflow, breach notification harness (72-hour clock).

---

## 6. Findings — AI integration

### 6.1 [CRIT] No JSON Schema validation on AI response

**Where:** `generateAssessment` strips markdown fences then `JSON.parse`s with no validation; on failure, alerts the user.
**Fix:** Validate against `zod`/`ajv` schema. If parse or schema fail, retry up to 2× with corrective system prompt; surface a structured error only after retries exhausted.

### 6.2 [IMP] Prompt is inline, untracked, unversioned

Prompts belong in `packages/prompts/` per CLAUDE.md repo layout, versioned and AuditEvent-loggable.

### 6.3 [IMP] Prompt does not guarantee distractor quality

Current prompt: _"Each question must have 4 options."_ — no instruction to make distractors plausible, no instruction to avoid trick wording, no instruction to vary cognitive level (recall vs application vs analysis per Bloom).
**Fix:** Add: 4 plausible options; exactly one correct; distractors reflect common misconceptions held by F70/100 type-rated pilots; explanation cites primary source (KCARs/AFM/QRH).

### 6.4 [IMP] No assessment difficulty calibration

Currently a single 5-question flat assessment regardless of pilot phase. ITR ground school and recurrent CRM differ profoundly in target knowledge.
**Fix:** Add `target_audience` (ITR ground / type recurrent / CRM / LPC-OPC review) to the prompt and let the operator select.

### 6.5 [REC] No assessment-to-pilot linkage

**Where:** Assessment history is per-browser, not per-pilot.
**Fix:** AssessmentResult belongs to a Pilot via `pilot_id`, with `topic`, `score`, `taken_at`, `proctored_by` (if invigilated), full Q/A capture for audit.

### 6.6 [REC] No Anthropic prompt-caching usage

For repeated assessment generations with the same long system context, cache the static portion. This is a cost & latency win at scale.

---

## 7. Findings — UX, workflow & feature gaps

### 7.1 [IMP] No session logging UI

No way for a TRI/TRE to log a session, grade exercises, write a debrief, or sign off. This is the heart of the platform; absent in the prototype.

### 7.2 [IMP] No exports

README lists Crew Currency Snapshot, Pilot Training File, Session Report, Compliance Evidence Pack, OM Cross-Reference Matrix — none present.

### 7.3 [IMP] No notification engine

Currency expiry is shown reactively (dashboard). No proactive email/SMS dispatch to pilots and HoT. Sprint 3 task; depends on operator preference for SMS (Africa's Talking is the popular Kenyan provider per CLAUDE.md open Q#6).

### 7.4 [IMP] No document version control / diff view

LEP auto-gen and per-page revision tracking are core OM management features.

### 7.5 [IMP] No KCAA submission flow

Reg 17(3) demands 30-day lead time; auto-calc of submission deadline relative to planned implementation, transmittal letter generation, version locking on submission.

### 7.6 [IMP] No FDAP / OR / SMS surface

Reg 56(2) makes FDAP mandatory for the fleet. Even a thin "FDAP exceedance link & trend" view is missing.

### 7.7 [REC] Currency tracker is matrix only; no per-currency drill-down

Clicking a cell should open history (when valid_from, source session, instructor, attached evidence).

### 7.8 [REC] No global search

Capt. Ng'ong'a has hundreds of pilots across two operators — finding "pilots due OPC in next 30 days who are at HKEL" needs a query surface.

### 7.9 [REC] No CSV/JSON import for crew bulk-onboarding

Existing operators have crew lists. Bulk import (with validation + dry-run preview) accelerates Phase 2 deployment.

### 7.10 [REC] No print-stylesheet

Inspector-facing exports default to PDF; current views do not have print CSS, so an emergency "print-the-screen" by an Accountable Manager produces ugly output.

### 7.11 [REC] No language toggle

CLAUDE.md open Q#7 — Kiswahili and French are realistic East African expansion targets.

### 7.12 [REC] No mobile-first crew view

Pilots will check own currency on phones; the current responsive design is OK but not optimised.

---

## 8. Findings — code quality & tooling

### 8.1 [CRIT] JavaScript, not TypeScript

**Where:** `.jsx` not `.tsx`; no type annotations.
**Why it matters:** Aviation domain modelling without types invites the kind of subtle category errors (typo `lineChek` → silent N/A) that the CLAUDE.md "TypeScript everywhere / strict mode on" rule forbids.
**Fix:** Sprint 1 ports the prototype to TS strict, with a domain types package (`packages/domain`).

### 8.2 [CRIT] Single-file architecture

Sprint 1 will explode this into `apps/web/`, `apps/api/`, `packages/*` per CLAUDE.md repo layout.

### 8.3 [IMP] No tests

No unit, integration, or e2e tests. The currency status calculation, `daysUntil`, and `overallStatus` are pure functions perfect for `vitest`.

### 8.4 [IMP] No CI

No GitHub Actions workflow exists yet. Sprint 1 task.

### 8.5 [REC] Naming is inconsistent

`k`/`l`/`m`/`cat` shortcuts in `CURRENCIES` array obscure intent. CLAUDE.md mandates domain-aligned names: `key`, `label`, `cycleMonths`, `category`. Likewise `st` for status, `r` for row, etc. — keep these only in tight scopes.

### 8.6 [REC] React patterns mix `setState` and ad-hoc effects for persistence

The "load on mount, persist on every change" pattern via `useEffect` is fragile. The production rebuild should use server state (tRPC / React Query) with optimistic updates.

### 8.7 [REC] Inline `style={{}}` for font family in the root div

Minor, but it would belong in a Tailwind theme extension or global stylesheet.

### 8.8 [REC] Magic constants strewn through render

Pass marks (80%), expiry thresholds (90/30/0 days), date format (`YYYY-MM-DD`) — extract to a `domain/constants.ts`.

### 8.9 [REC] `confirm`/`alert` for user dialogs

Replace with controlled modals (already in use elsewhere — be consistent).

---

## 9. Findings — operator configuration

### 9.1 [IMP] Operators are string-typed; can't carry configuration

**Where:** `OPERATORS = ["JAK", "I-Fly"]`.
**Fix:** Operator entity per §4.2 above. Per-operator config table: stabilised gates, fuel-policy defaults, MEL link, OpSpec section refs, AOC number, KCAA inspector contact, brand colours (DNCA: navy + amber; Jetways: navy + blue per CLAUDE.md).

### 9.2 [IMP] Fleet is a flat string array; F70 HGW MTOW differences are content-only

Per §4.7, Aircraft (registration-level) carries the MTOW/MLW/MZFW and HGW flag.

### 9.3 [REC] Base list is hardcoded ICAO codes

Should be operator-scoped, with diversion/alternate categorisation and aerodrome qualification dependencies.

### 9.4 [REC] No OpSpec surface

OpSpec parameters (RVSM, RNAV/RNP, Cat II/III auth, EDTO if applicable, LVO auth) drive what currencies are needed.

---

## 10. Tactical fixes — immediate, low effort, high value

These can be applied during Sprint 1 port (or even on the frozen prototype if a demo is needed before the rebuild):

1. **Fix the in-training pilot bug** (`addPilot` branch) so medical and licence get real dates.
2. **Split `windshearUprt`** into two currencies.
3. **Update the model identifier** to the current Sonnet.
4. **Add the 8 missing currencies** to the `CURRENCIES` array (no UI work — table already iterates).
5. **Soft-delete instead of `confirm()` + remove from array** — store `deletedAt`/`deletedBy`.
6. **Replace `alert("Failed to generate questions")`** with a user-facing error banner that captures the AI response for debugging.
7. **Move the AI prompt to a constant** (`packages/prompts/assessment.ts` once the monorepo lands).
8. **Add primary-source citations** (LN ref, AFM page, Doc 9868 §) to each knowledge library section's body — already nearly there for some entries, just be uniform.
9. **Surface "supersedes FORDEC"** in the T-DODAR library entry so the constraint is documented in-product.
10. **Tag landing-flap vs takeoff-flap** distinctions in the flight controls entry.

---

## 11. Strategic recommendations — mapped to Sprints 1–5

| Recommendation                                                            | Sprint | Notes                                                           |
| ------------------------------------------------------------------------- | ------ | --------------------------------------------------------------- |
| Stand up Postgres, RLS, audit-log trigger                                 | 1      | CLAUDE.md §"Audit logging" is the spec                          |
| Port data model to TS strict; add Session/Exercise/Grade/SignOff entities | 1      | Frame the domain before the UI port                             |
| Add Operator, User, Role entities; magic-link auth as fallback            | 1      | RBAC at service layer per §"Security"                           |
| Port prototype UI tab-by-tab to Next.js App Router                        | 2      | Server Components by default                                    |
| Add the 8 missing currencies + fix ITR logic                              | 2      | Mostly schema and seed                                          |
| Move Anthropic API server-side; add schema validation, retry, audit       | 2      | Sprint 2 closes the prototype's biggest hole                    |
| RBAC enforcement, soft-delete, signed mutations                           | 3      | Service-layer authorisation                                     |
| Notification engine (email; SMS pending operator choice)                  | 3      | Africa's Talking for SMS if approved                            |
| Document version control with diff & LEP generation                       | 3      | High value for HoT users                                        |
| KCAA submission flow with 30-day deadline calc                            | 3      | Reg 17(3) compliance                                            |
| Per-exercise 8-competency CBTA grading UI; radar aggregation              | 4      | Replace the simplistic regex pattern from the earlier prototype |
| Citation engine (every regulatory claim hyperlinks)                       | 4      | Builds on the regulatory ontology package                       |
| Per-operator configuration (gates, OpSpecs, fleet)                        | 4      | Closes §9 gaps                                                  |
| Multi-tenant cutover with two demo operators                              | 5      | JAK + I-Fly seeded                                              |
| Penetration test, ODPC registration, breach harness                       | 5      | DPA 2019 close-out                                              |
| Observability via OpenTelemetry + chosen vendor                           | 5      | Grafana Cloud or Datadog per CLAUDE.md                          |

---

## 12. Open questions surfaced by this audit

In addition to CLAUDE.md's existing seven open questions, this audit raises:

8. **Tay engine description** — FADEC / supervisory EEC / PMC? (3.1)
9. **Pneumatics — confirm two-pack architecture for both F70 and F100** (or any difference between the variants).
10. **RVSM cycle** — the prototype uses 36 months; confirm against operator OM-B (some operators treat RVSM training as one-off plus continuing operational compliance).
11. **EGPWS/TAWS recurrent cycle** — the prototype uses 36 months; confirm.
12. **Aerodrome qualification taxonomy** — Cat A/B/C per KCAA list? Operator's own list? Per-airport familiarisation?
13. **Soft-delete vs hard-delete policy** for crew records leaving the operator (medical retention obligations vs employment records overlap).
14. **Per-operator branding** beyond colour: logo on PDF exports? KCAA cover letter signatories? Letterhead?

---

## 13. Items to verify against primary source before locking in code

This list is the "stop and ask before you guess" set per CLAUDE.md:

- Tay 620-15 control architecture (FADEC vs supervisory) (§3.1)
- F70 vs F100 packs / pneumatic differences (§3.5)
- RVSM and EGPWS/TAWS recurrent cycle policy (§12.10–11)
- Cat II/III currency cycle (6-month per EASA FCL.825, but operator OM-B may extend or shorten)
- Aerodrome qualification model (§12.12)
- Whether `LineCheck` cycle is operator-configurable (annual is common; some operators use 6-month for new captains)
- Whether `SEP wet/dry alternation` is annual-alternate or biennial — varies by operator

---

## 14. Conclusion

The prototype is a strong UX specification and contains real domain depth that the production rebuild should preserve. The fixes are not corrections to a flawed concept — they are the application of regulated-records discipline (audit, retention, tenancy, RBAC) and CBTA primitives (Session/Exercise/Competency/Grade) to an already-credible feature set.

Recommend proceeding with Sprint 1 as scoped in `CLAUDE.md`, with the §10 tactical fixes applied during the port. The §11 strategic recommendations are already broadly aligned with the planned sprint sequence; this audit's contribution is to make the line-by-line gaps explicit and traceable.

— _Audit prepared for Capt. Dan Moi Ng'ong'a, DN Consultancy Aviation, against the production rebuild specification in `CLAUDE.md` and `README.md`._

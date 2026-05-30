# 0006 — AircraftTypeProfile as the type-extensibility plug-in pattern

**Status:** Accepted
**Date:** 2026-05-25
**Deciders:** Capt. Dan Moi Ng'ong'a; Claude Code agent

## Context

CLAUDE.md and README position the platform as a forward-deployed engineering model — operator deployments are bespoke configurations on top of reusable primitives. Until now the codebase encoded a single aircraft type (F70/100) at the domain layer: `AIRCRAFT_FACTS` is a const, the AI prompt block hardcodes RR Tay / GTCP36 / PPAA / VMA / Flaps 0 policy, and the Postgres `fleet_variant` enum lists only `F70 / F70-HGW / F100`.

That worked while there was one type. The commercial assessment surfaces two reasons to generalise now:

1. **Market depth.** The global active F70/100 fleet is small and end-of-life. Extending to East African workhorses (Boeing 737NG, Embraer E170/190, ATR 72) materially enlarges the addressable market without rebuilding the spine.
2. **Operator configurability.** Per the deployment model, each operator should be able to enable the aircraft types they actually fly — no more, no less.

The constraint is safety. Aviation facts are not generic content; an invented engine designation or fuel-asymmetry limit is a credibility-destroying defect. The plug-in pattern must distinguish between (a) facts that are sourced and ready for operator use and (b) profiles that are structurally present but pending primary-source population.

## Decision

Introduce a typed entity `AircraftTypeProfile` in `@dnca/domain` that holds:

- **Identity** — short label, long label, status (`production-ready` | `preview` | `draft`).
- **Manufacturer facts** — engine designation, APU designation, hydraulic-system count, variants array (each with MTOW/MLW/MZFW and notes).
- **Operational profile** — takeoff/landing flap policy, OEI technique, max fuel asymmetry, approach-speed source, decision framework. Every operational field is optional; a `pendingPrimarySource` flag marks the profile as not-yet-cleared for operator use.
- **AI calibration** — examiner role description (always present), technical-facts block (optional, populated when ready), regulatory anchors, question-quality requirements.

A registry `AIRCRAFT_TYPE_PROFILES` lists the platform's known types. `F70_100_PROFILE` is `production-ready` and the default; `B737_PROFILE` (and future types) start as `preview` with structural presence and clear gaps until a TRI/TRE flagged for that type populates the operational and AI-calibration content.

`@dnca/prompts` builds the system-prompt calibration block at request time by reading the profile. The static block remains cacheable (Anthropic prompt cache) because the profile content is deterministic per type; only the per-request dynamic block carries topic and target.

`apps/web` surfaces:

- A type selector on `/assessments`. Selecting a `preview` profile shows a warning and emits a less-specific prompt rather than fabricated technical claims.
- A `/aircraft?typeId=…` profile-driven view that replaces the old F70-only page.

The Postgres `fleet_variant` enum was extended in migration `0002_fleet_variant_b737.sql` to add `'B737'` when the demo seed adopted Jubba Airways Kenya as the B737NG preview-tier deployment. Future types follow the same additive-migration pattern.

## Consequences

- **Operator deployments fan out without spine changes.** Adding the B737NG (or any other type) to an operator's contract becomes a content task (populate the profile, calibrate prompts) rather than an engineering task.
- **Safety discipline is enforced by the type system.** A `preview` profile's missing `technicalFactsBlock` makes the AI prompt fall back to a generic examiner role rather than inventing facts. CLAUDE.md's "don't generate fake aviation facts" rule is now structural, not just advisory.
- **The platform-vs-deployment distinction crystallises.** Profile authoring is a deployment activity owned by the operator's TRI/TRE. The platform code is profile-agnostic.
- **F70/100 stays the production-ready primary**, with the demo seed assigning the F70/100 production demo to I-Fly Air Solutions and a B737NG preview demo to Jubba Airways Kenya. Existing tests, fixtures, and demo flows continue to work; selecting F70/100 in the type selector produces the same prompt and the same outputs as before.
- **`AIRCRAFT_FACTS` is preserved** as a derived export for back-compat. New code should consume `F70_100_PROFILE.manufacturerFacts` directly.

## Alternatives considered

- **Per-operator config tables holding aircraft facts.** Rejected: operator-scope is wrong scope for content that's identical across operators flying the same type. Profile-scope is the natural unit.
- **External content packs (npm packages per aircraft type).** Considered for the long term. Premature today — would impose package-management overhead before there's a content-author audience. Re-evaluate when there are 4+ types in active use.
- **Single generic profile + per-operator overrides.** Rejected: makes the question "what's the truth about this engine?" indeterminate. Profiles are the truth for their type; operators get only the OpSpec-level overrides already on `OperatorConfig` (gates, fuel policy, OpSpec flags).

## Phase-2 deployment workflow (per type)

Per CLAUDE.md §"Strategic positioning":

1. **Phase 0** — operator Discovery. Aircraft type identified.
2. **Phase 1** — Compliance Package authoring. The deployment team (TRI/TRE qualified for the type) populates the `AircraftTypeProfile` if not already `production-ready`: manufacturer facts, operational profile, AI calibration block.
3. **Phase 2** — Platform Deployment. The operator's `Fleet` rows reference the now-`production-ready` profile. Assessments calibrate correctly; aircraft-page renders correctly; KCAA-aligned exports cite the right type-specific anchors.
4. **Phase 3** — Continuous. Profile updates follow the same versioning discipline as prompts (see ADR-pending on prompt versioning).

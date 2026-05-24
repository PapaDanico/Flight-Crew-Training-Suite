# 0004 — `@dnca/domain` is the single source of truth for entity types

**Status:** Accepted
**Date:** 2026-05-24
**Deciders:** Capt. Dan Moi Ng'ong'a (delegated); Claude Code agent

## Context

CLAUDE.md prescribes a monorepo layout with `packages/domain` for "Shared TS types: Pilot, Currency, Session, etc.". Without a normative location, types tend to drift: backend defines its own `Pilot`, frontend defines a slightly different one, and the API contract becomes whatever the most recent migration says it is.

The Phase-0 audit identified missing entities (Session, Exercise, Competency, Grade, SignOff, DebriefNote, AssessmentResult, Document, DocumentVersion, KCAASubmission, AuditEvent, User, RoleAssignment) and a misshaped currency model. The platform's regulatory credibility depends on these being modelled once, modelled correctly, and reused everywhere.

## Decision

`packages/domain` is the single source of truth for:

- All entity interface declarations (`Operator`, `Pilot`, `Aircraft`, `Currency*`, `Session`, `Exercise`, `Document*`, `User`, `RoleAssignment`, `AuditEvent`, …)
- All enumerated domain constants (`CURRENCY_KIND`, `ICAO_COMPETENCY`, `TRAINING_PHASE`, `ROLE`, `AUDIT_ACTION`, …)
- All branded primitive types (`OperatorId`, `PilotId`, `IsoDate`, …)
- Pure domain functions (`statusFor`, `mayBeNotApplicable`, `calculateSubmissionDeadline`, `exceedsFdapThreshold`, …)
- Pinned model identifiers and prompt-version strings (`ANTHROPIC_MODELS`)
- Authoritative aircraft facts (`AIRCRAFT_FACTS`)

Backend code, frontend code, exporters, and AI prompt templates import from `@dnca/domain` exclusively. Database schema is generated from (or hand-authored against) these types and asserted via integration tests.

When an entity changes, the change lands in `packages/domain` first; downstream consumers' type-checks then fail until they conform. This is the intended pressure direction: the model leads, the code follows.

The package has no runtime dependencies — it is pure TypeScript. This keeps it cheap to import from every other package and prevents accidental coupling.

## Consequences

- An entity changes in one place; the entire codebase sees the change at type-check time.
- Domain-aligned naming is forced by the package — `medicalExpiry`, not `med_exp`.
- The package becomes a meaningful artifact for KCAA conversations: the model file is the model.
- New entities require a coordinated change across domain + persistence + API + UI — discipline that the safety case demands.
- Schemas (Zod / Drizzle / OpenAPI) derive from `@dnca/domain` types, not the other way round.

## Alternatives considered

- **Define types in each app** — rejected: drift is inevitable; the Phase-0 audit shows what undisciplined typing looks like.
- **Generate types from the database schema** — rejected as the primary direction: the model is conceptually upstream of the storage layout, even if the storage layout is derived from it. Generation is acceptable as a verification step (types-from-schema must equal `@dnca/domain` types).
- **Generate types from the OpenAPI spec** — rejected: the OpenAPI spec is the wire format, not the domain; the domain is upstream of both.

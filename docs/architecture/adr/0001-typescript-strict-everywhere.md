# 0001 — TypeScript strict everywhere

**Status:** Accepted
**Date:** 2026-05-24
**Deciders:** Capt. Dan Moi Ng'ong'a (delegated); Claude Code agent

## Context

The platform stores regulated aviation records. Subtle category errors — a typo in a currency key silently routing to N/A, a `number` confused with a date string, an undeclared null reaching a sign-off — are the class of bug that erodes operator trust and KCAA inspector confidence.

The prototype is JavaScript with no types; it has at least one known logic bug (in-training pilots incorrectly N/A on medical/licence) that strict typing would surface at the point of construction.

## Decision

All application code — backend, frontend, packages, scripts, infrastructure tooling — is TypeScript with `strict: true` and the additional flags:

- `noImplicitAny`
- `strictNullChecks`
- `strictFunctionTypes`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `isolatedModules`
- `forceConsistentCasingInFileNames`

`any` requires a `// TODO(claude): why any?` comment and a follow-up issue. There are no exceptions for "prototype-quality" code — there is no prototype-quality code in this repository (the prototype is frozen under `/prototype/`).

Branded primitive types (e.g. `OperatorId`, `IsoDate`) are used to prevent identifier and date-string confusion at type-check time.

Plain JavaScript is allowed only in build tooling that cannot reasonably be TypeScript (e.g. a one-line shell wrapper).

## Consequences

- Single language across the stack; no boundary translation cost.
- Refactors are mechanically safe — the type-checker is the first line of defence.
- New entities must be defined in `@dnca/domain` before they can be persisted or rendered.
- Onboarding requires TypeScript fluency; there is no on-ramp for a junior who only knows JavaScript.
- Build times slightly longer; mitigated by incremental builds and project references.

## Alternatives considered

- **JavaScript with JSDoc types** — rejected: weaker enforcement at boundaries, no branded primitives, ecosystem narrowing.
- **TypeScript with `strict: false`** — rejected: defeats the safety case; the known prototype bug would still slip through.
- **Mixed JS/TS by package** — rejected: boundary types degrade silently; the audit log is everywhere, so safety must be everywhere.

# Architecture Decision Records

Each ADR captures one architectural decision in context: why it was needed, what was decided, and what the consequences are. ADRs are written once and not edited; if a decision is reversed, write a new ADR that supersedes the old one.

## Template

```
# NNNN — <title>

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
**Date:** YYYY-MM-DD
**Deciders:** <names>

## Context
<the problem, constraints, forces>

## Decision
<the chosen option, in clear prose>

## Consequences
<what changes, what's now possible, what's now harder>

## Alternatives considered
<options not chosen, briefly, with why>
```

## Index

| #                                                | Status   | Title                                                           |
| ------------------------------------------------ | -------- | --------------------------------------------------------------- |
| [0001](./0001-typescript-strict-everywhere.md)   | Accepted | TypeScript strict everywhere                                    |
| [0002](./0002-multi-tenancy-via-postgres-rls.md) | Accepted | Multi-tenancy via Postgres row-level security                   |
| [0003](./0003-append-only-audit-log.md)          | Accepted | Append-only audit log enforced by Postgres triggers             |
| [0004](./0004-domain-package-source-of-truth.md) | Accepted | `@dnca/domain` is the single source of truth for entity types   |
| [0005](./0005-drizzle-orm-for-db-layer.md)       | Accepted | Drizzle ORM + drizzle-kit for the database layer                |
| [0006](./0006-aircraft-type-profile-plug-in.md)  | Accepted | `AircraftTypeProfile` as the type-extensibility plug-in pattern |
| [0007](./0007-fastify-backend.md)                | Accepted | Fastify for the backend API                                     |
| [0008](./0008-workos-auth.md)                    | Accepted | WorkOS for authentication and SSO                               |
| [0009](./0009-aws-af-south-1-hosting.md)         | Accepted | AWS `af-south-1` (Cape Town) for production hosting             |

## Open architectural decisions

These are listed in `CLAUDE.md` §"Open questions for Capt. Ng'ong'a" and will become ADRs once resolved:

- Backend framework: Fastify vs NestJS
- Auth provider: WorkOS vs Clerk
- Hosting region: AWS `af-south-1` vs Azure South Africa North
- Grading scale alignment: AS/S/MS/BS vs ICAO 1–5
- Notification channels: email-only vs email + SMS via Africa's Talking
- Languages supported initially

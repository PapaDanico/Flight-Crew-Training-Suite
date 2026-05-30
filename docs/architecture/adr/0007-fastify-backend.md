# 0007 — Fastify for the backend API

**Status:** Accepted
**Date:** 2026-05-24
**Deciders:** Capt. Dan Moi Ng'ong'a (delegated); Claude Code agent

## Context

CLAUDE.md left the backend framework open between Fastify (lean) and NestJS (structured). The choice gates `apps/api` and everything downstream — auth wiring, route shape, observability, testing patterns.

## Decision

**Fastify** over NestJS for `apps/api`.

## Why

- **Single-author surface.** DNCA is one consultant + one engineer (today). NestJS's module/provider/controller/service structure is genuinely useful at 10+ engineers; below that it taxes velocity without paying for itself.
- **Performance ceiling matters at operator scale.** Per-tenant traffic on a 50-pilot operator is low, but multi-tenant aggregations (cross-operator KCAA reports for DNCA-internal use) benefit from Fastify's lower per-request overhead.
- **Schema-first via Zod fits the existing stack.** Fastify's `setValidatorCompiler` / `setSerializerCompiler` plug into Zod cleanly; we already use Zod in `@dnca/prompts` and have no NestJS DTO/decorator ecosystem in the codebase.
- **Smaller dependency tree.** Fastify + ~6 plugins vs NestJS + ~20+ packages. Lower supply-chain attack surface for a regulated-records system.
- **Plugin architecture for cross-cutting concerns** (auth, tenant scope, audit, error mapping) maps cleanly to the per-request middleware pattern we need.

## Consequences

- Routes are explicit functions registered against the app instance — no decorators.
- Auth, tenant scoping, and audit emission are Fastify plugins.
- Testing uses Fastify's `app.inject()` for in-process request simulation — no HTTP listener needed in unit tests.
- If we ever need NestJS's module-injection capabilities at scale, migration is a per-route rewrite, not a wholesale change.

## Plugins committed to (Sprint 1):

- `@fastify/cors` — CORS (apps/web origin only in production).
- `@fastify/helmet` — security headers.
- `@fastify/rate-limit` — global + per-route limits.
- `@fastify/sensible` — error helpers.
- `fastify-type-provider-zod` — Zod schema validation at the route boundary.
- Custom plugins (in `apps/api/src/plugins/`): `auth`, `tenant`, `audit`, `error-mapper`.

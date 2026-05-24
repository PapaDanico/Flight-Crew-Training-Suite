# 0002 — Multi-tenancy via Postgres row-level security

**Status:** Accepted
**Date:** 2026-05-24
**Deciders:** Capt. Dan Moi Ng'ong'a (delegated); Claude Code agent

## Context

The platform serves at least two operators today (Jubba Airways Kenya, I-Fly Air Solutions) with more East African operators in the deployment pipeline. Each operator's training records, crew data, and submitted manuals must be invisible to every other operator. A leak is a regulatory incident under Kenya Data Protection Act 2019 and an operator confidence event for DNCA.

The prototype has no multi-tenancy: a single React state tree mixes both operators' pilots.

The choice space for multi-tenancy:

1. **Database-per-tenant** — strongest isolation; highest operational overhead; cross-tenant analytics painful.
2. **Schema-per-tenant** — moderate isolation; migration discipline gets fragile at scale.
3. **Shared schema with `operator_id` column on every tenant-scoped table** — leanest; isolation depends on application discipline unless enforced by the database.
4. **Shared schema with Postgres row-level security (RLS) policies** — leanest, with defence-in-depth from the database engine, independent of application bugs.

## Decision

Option 4: single Postgres cluster, single schema, every tenant-scoped table carries `operator_id uuid not null`, and every such table has an RLS policy that restricts `SELECT/INSERT/UPDATE/DELETE` to rows where `operator_id = current_setting('app.operator_id')::uuid`.

Every API request resolves the operator from authentication claims and sets the `app.operator_id` session variable before executing any tenant-scoped query.

The `PLATFORM_ADMIN` role is the only role that can SET the operator id to a different tenant within a request, and every such request emits an `AuditEvent` with `action = CROSS_TENANT_ACCESS` (added to the audit action enum when needed).

System tables (e.g. `users`, `audit_event`, `kcaa_regulation_reference`) that legitimately span tenants are either nullable on `operator_id` (audit log) or explicitly NOT under RLS (regulatory reference data, which is global).

## Consequences

- A single forgotten WHERE clause in an application query does not breach tenant isolation — RLS rejects the row at the database boundary.
- Migrations are simple: one schema, one set of changes.
- Cross-tenant analytics are possible for `PLATFORM_ADMIN` users via explicit elevation, audited.
- Connection pooling must propagate the session variable per request — this is a known operational pattern but requires care with PgBouncer transaction-mode pooling. Either use session-mode pooling, or use Postgres-native `SET LOCAL` within transactions.
- Performance: RLS adds a predicate to every query; with the `operator_id` index this is essentially free.

## Alternatives considered

- **Database-per-tenant** — rejected: operational overhead for ~10 expected operators; cross-tenant DNCA analytics impossible without ETL.
- **Schema-per-tenant** — rejected: migration drift risk; tooling support patchier than for RLS in PG15+.
- **Application-layer scoping only** — rejected: a single missed WHERE leaks the entire operator. Defence-in-depth is non-negotiable.

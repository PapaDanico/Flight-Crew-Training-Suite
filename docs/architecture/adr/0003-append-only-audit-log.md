# 0003 — Append-only audit log enforced by Postgres triggers

**Status:** Accepted
**Date:** 2026-05-24
**Deciders:** Capt. Dan Moi Ng'ong'a (delegated); Claude Code agent

## Context

A KCAA inspector must be able to reconstruct the full history of any record: who created it, who last changed it, what the previous value was, when each change occurred, what action triggered the change, and what request originated the action. Without this, the platform cannot serve as the operator's training-records system of record under KCARs.

Kenya Data Protection Act 2019 requires controllers to maintain processing records (Article 41). The audit log is the platform's evidence that processing was lawful, scoped, and accountable.

The Phase-0 audit's finding §2.1 records that the prototype has no audit trail.

The choice space:

1. **Application-only audit log** — every mutation handler writes an event row alongside the mutation. Brittle: developer discipline is the only thing preventing drift.
2. **Application-emitted, database-immutable audit log** — the application writes events; the database physically prevents updates and deletes on the event table.
3. **External event-store service** (e.g. EventStoreDB) — strongest event-sourcing semantics; new operational dependency; cross-store consistency to manage.

## Decision

Option 2: every state-changing operation emits a row into the `audit_event` table. The table is protected by Postgres triggers that raise an exception on `UPDATE` and `DELETE`, regardless of role (including the `PLATFORM_ADMIN` role used by the application). Only an out-of-band SQL session with the `postgres` superuser role and a documented break-glass procedure can modify or remove audit rows — and every such intervention is itself logged in an external incident record.

Emission is enforced by API middleware: every mutation route is wrapped in a transactional handler that requires an `AuditEvent` to be produced as a sibling of the state change. Routes that fail to emit an event fail the request — this is checked at integration-test time, not at runtime.

Field set per `AuditEvent` (see `packages/domain/src/governance.ts`):

- `id`, `operator_id`, `actor_user_id`, `actor_role`
- `entity_type`, `entity_id`
- `action` (`CREATE` / `UPDATE` / `SOFT_DELETE` / `HARD_DELETE` / `SIGN_OFF` / `EXPORT` / `ASSESSMENT_GENERATED` / `KCAA_SUBMISSION_*` / `AUTH_*` / `ROLE_*`)
- `before_state` (jsonb), `after_state` (jsonb)
- `occurred_at`, `request_id`, `ip_address`, `user_agent`

`operator_id` is nullable for global events (authentication failure before tenant resolution, platform-admin actions).

Retention: indefinite for the lifetime of an operator deployment, with a documented backup-and-rotation policy for storage cost management.

## Consequences

- A KCAA inspector can reconstruct the history of any record from the database alone.
- Application bugs that fail to emit events are caught in tests, not in production.
- Storage grows monotonically; budgeted as a known operational line item.
- Schema changes to entities must include an audit-log migration consideration: the `before_state`/`after_state` shape evolves naturally with the entity (jsonb).
- The audit log is the single highest-value table for forensic investigations and the single highest-risk table for malicious tampering — break-glass procedure is documented in `/docs/audit/`.

## Alternatives considered

- **Application-only audit** — rejected: relies on developer discipline; impossible to evidence to KCAA that all events are captured.
- **EventStoreDB / external service** — rejected for v1: another operational dependency, eventual-consistency considerations between the event store and the operational store; PG-native triggers are sufficient for the platform's scale.
- **WORM filesystem / object-store immutability for log shipping** — added as a follow-on: ship the audit log to S3 Object Lock for tamper-evidence at the storage layer, as a Sprint 5 hardening task. Not in scope for this ADR.

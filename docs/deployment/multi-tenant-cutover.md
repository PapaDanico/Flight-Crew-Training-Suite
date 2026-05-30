# Multi-tenant operator cutover playbook

How to bring a new operator (e.g. JAK, I-Fly) live on the shared single-cluster, RLS-isolated platform. This is a Phase-2 deployment task; it is configuration on shared primitives, not an engineering change.

## Isolation model (what we rely on)

- **One Postgres cluster, one schema; every tenant-scoped table carries `operator_id`** with row-level security `ENABLE`d + `FORCE`d.
- The application connects as a **non-`BYPASSRLS` role** (`app_runtime`); each request opens a transaction and runs `SET LOCAL app.operator_id = '<uuid>'`, so RLS policies (`operator_id = current_operator_id()`) constrain every read/write. `platform_admin` (BYPASSRLS) is reserved for cross-tenant admin only.
- The **audit_events** table is itself RLS-scoped and append-only (UPDATE/DELETE/TRUNCATE rejected by trigger).
- CI proves this every run: the migration smoke test asserts cross-tenant reads return zero rows and that the audit table rejects mutation. **Do not cut over if that job is red.**

## Pre-cutover checklist

- [ ] Operator paperwork: AOC number, legal/trading name, Accountable Manager contact.
- [ ] **Data-protection posture confirmed** (controller vs processor) and agreement papered — see `docs/compliance/odpc-data-protection.md`.
- [ ] OM-A configuration captured: stabilised-approach gate heights, grading scale, fuel policy, OpSpecs (RVSM/RNP/CAT II/III/LVO/EDTO), branding.
- [ ] Auth tenant mapping ready (the WorkOS organisation id → operator), once auth hosting is greenlit.

## Provisioning steps

1. **Build the operator row** from the vetted spec with the pure resolver — same code path a future admin UI uses, so validation and config defaults are identical:

   ```ts
   import { resolveOperatorOnboarding } from '@dnca/domain';
   const operator = resolveOperatorOnboarding(spec, {
     id: crypto.randomUUID() as OperatorId,
     now: new Date().toISOString() as IsoDateTime,
   });
   ```

   `resolveOperatorOnboarding` validates shortCode/AOC/email, trims input, and merges `configOverrides` onto `DEFAULT_OPERATOR_CONFIG` (per sub-object). It throws on invalid input with an operator-safe message.

2. **Insert inside one transaction**, scoped to the new operator: `SET LOCAL app.operator_id = '<new uuid>'`, then insert the operator, its initial Accountable-Manager `User` + `RoleAssignment`, and any baseline reference rows. The currency _catalogue_ is global (not per-tenant) — nothing to seed there.

3. **Map auth** (when hosted): record the operator's WorkOS organisation id in `config.jsonb` so the auth plugin resolves the JWT `org_id` to this operator.

4. **Emit an `AuditEvent`** (`CREATE` on the operator) — provisioning is a state change and must be on the audit trail like any other.

## Verify isolation before go-live (go/no-go)

Run these as `app_runtime` (not a superuser):

- [ ] Scoped to the new operator, you can read its own rows.
- [ ] Scoped to the new operator, a `SELECT` of another operator's pilots returns **0 rows** (RLS, not a `WHERE` clause).
- [ ] With **no** `app.operator_id` set, tenant tables return 0 rows (fail-closed; the pooled-connection scope is cleared to `''` between requests).
- [ ] An attempt to `UPDATE`/`DELETE` `audit_events` is rejected.
- [ ] Access logs for the smoke requests carry the new `operatorId` (see `docs/operations/observability.md`).

Only when all five pass is the tenant cleared for go-live.

## Smoke test (fixtures parity)

Point the web app at the API in demo/workos mode and confirm the new operator's `/pilots`, `/compliance`, and the export routes (Crew Currency Snapshot, OM Matrix, KCAA Transmittal, Compliance Evidence Pack) render against live data — the numbers should match what the builders produce, since the same `@dnca/domain` logic backs both.

## Rollback

Because the platform is additive and audited, rollback is `status: 'archived'` on the operator (soft-disable) rather than deletion — preserving the audit trail and the statutory retention window. Hard deletion only after the retention period and with a documented lawful basis (see ODPC pack §4 erasure).

## Notes

- No real pilot data in demo/test environments — synthetic cohort only (Capt. Alpha One pattern).
- Each cutover is bespoke configuration; this playbook is the repeatable spine.

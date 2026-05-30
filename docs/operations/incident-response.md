# Incident response runbook

Operational MVP. Single-operator deployment on AWS af-south-1 (ADR 0010). This is the runbook the on-call engineer reads first.

## Triage matrix

| Symptom                               | Probable cause                                                                             | First check                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Web returns 5xx                       | api unreachable from web tier, or web Fargate task crashed                                 | CloudWatch `/aws/ecs/<op>-prod-web` last 5 min                                                 |
| API returns 401 to every request      | WorkOS JWKS unreachable, expired tokens, or env regression                                 | CloudWatch `/aws/ecs/<op>-prod-api`; test `curl https://api.workos.com/sso/jwks/<client_id>`   |
| API returns 403 to every request      | `org_id` claim missing from token OR operator config missing `workosOrganizationId`        | `psql ... -c "SELECT short_code, config->>'workosOrganizationId' FROM operators"`              |
| RDS connection failures               | Security group regression OR DB instance restarting                                        | RDS event log; verify `aws_security_group.rds` allows `aws_security_group.ecs` ingress on 5432 |
| AuthKit sign-in loops                 | `WORKOS_COOKIE_PASSWORD` rotated mid-session OR `NEXT_PUBLIC_WORKOS_REDIRECT_URI` mismatch | Compare web env vars vs WorkOS dashboard redirect URI exactly                                  |
| `/pilots` shows fixtures unexpectedly | `API_BASE_URL` unset OR network egress blocked from web → api                              | `aws ecs describe-services` for env vars; security group review                                |

## Rollback

Every deploy via `infra/terraform/deploy.sh` tags the image with both `:latest` and `:<short-sha>` in ECR. To roll back:

```bash
# Identify the previous good SHA
aws ecr describe-images \
  --repository-name <op>-prod-api \
  --query 'sort_by(imageDetails,&imagePushedAt)[*].[imageTags,imagePushedAt]' \
  --output table

# Pin the previous SHA into the task def via terraform
cd infra/terraform
terraform apply \
  -var "api_image=<account>.dkr.ecr.af-south-1.amazonaws.com/<op>-prod-api:<previous-sha>" \
  -var "web_image=<account>.dkr.ecr.af-south-1.amazonaws.com/<op>-prod-web:<previous-sha>"

# Force the service to pick up the pinned digest immediately
aws ecs update-service --cluster <op>-prod-cluster \
  --service <op>-prod-api --force-new-deployment
```

If a migration broke things, **do not run reverse migrations**. Restore from RDS point-in-time recovery to a fresh instance, point the connection string at it, investigate offline.

## Database access (one-off operations)

The RDS instance is in private subnets only. For emergency access:

```bash
# Temporarily allow your laptop IP on the RDS SG
YOUR_IP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress \
  --group-id $(terraform -chdir=infra/terraform output -raw rds_security_group_id) \
  --protocol tcp --port 5432 --cidr "${YOUR_IP}/32"

# Connect
DB_URL=$(aws secretsmanager get-secret-value \
  --secret-id <op>-prod-database-url \
  --query SecretString --output text)
psql "$DB_URL"

# REVOKE WHEN DONE
aws ec2 revoke-security-group-ingress ...
```

**Don't leave the rule in place.** Every minute it lingers, your laptop IP is one compromised laptop away from being a direct line to KCAA-regulated data.

Sprint 5 replaces this dance with SSM Session Manager + a tiny bastion task.

## Audit obligations during incidents

- **Don't bypass the audit log to "fix" a bad row.** The `audit_events` triggers are non-overrideable by design. To correct a wrong record:
  - Currency: issue a new record with a `notes` field explaining the correction; the old record stays in `audit_events.before_state` of the new event
  - Pilot: PATCH with the corrected value; the AuditEvent UPDATE row captures the before/after
  - Session: POST `/sessions/:sessionId/void` with a written reason (>=8 chars). Restricted to HOT / AM / PLATFORM_ADMIN; the before/after status transition is captured in `audit_events`. If the void itself is contested, log a corrective sign-off on a successor session that references the original.

- **Anything that touches multi-operator data** must be done by a `PLATFORM_ADMIN` principal AND logged in an out-of-band incident report. The `PLATFORM_ADMIN` role bypasses RBAC (by design) and `BYPASSRLS` on the platform_admin Postgres role lets it read across operators. Use that authority sparingly.

## Auth regression (WorkOS)

If WorkOS goes down or the JWKS endpoint becomes unreachable:

1. Every API request will 401 (no JWT can verify).
2. **Do not** flip `NODE_ENV` to non-production as a workaround — the auth plugin will refuse to boot now if `WORKOS_*` secrets are set (defence in depth committed `claude/operational-hardening`).
3. Right path: wait for WorkOS recovery; communicate to operator users that sign-in is unavailable.
4. Per CLAUDE.md, AuthKit's magic-link fallback is in scope but not yet wired — Sprint 3 follow-on.

## On-call escalation

| Severity | Definition                                           | Escalate to             |
| -------- | ---------------------------------------------------- | ----------------------- |
| SEV-1    | Cannot sign in OR data loss observed                 | Capt. Ng'ong'a directly |
| SEV-2    | Functional regression, fixture-mode fallback engaged | Engineering on-call     |
| SEV-3    | Cosmetic / non-data-affecting                        | Next business day       |

KCAA notification thresholds (Kenya DPA 2019 + KCARs): any actual or suspected unauthorised access to pilot records is **72-hour reportable**. Don't deliberate; tell Capt. Ng'ong'a within the first hour, draft the notification within the first 24.

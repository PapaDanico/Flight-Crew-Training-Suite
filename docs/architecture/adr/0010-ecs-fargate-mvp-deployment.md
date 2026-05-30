# ADR 0010 — ECS Fargate MVP deployment topology on AWS af-south-1

**Status:** Accepted · 2026-05-27

## Context

ADR 0009 fixes the production region to AWS af-south-1 (Cape Town) for Kenya DPA 2019 residency. With Sprint 2 closed (write-path complete, web wired to API, WorkOS auth on), the platform needs a deployment topology that:

- Stands up cheaply for the first operator (single deployment, no traffic)
- Preserves the multi-tenant safety properties already proven in the API (RLS, audit log, encrypted transit)
- Doesn't lock us into a path that's painful to walk back from
- Can be brought up by one engineer in under a day

## Decision

Single-AZ-able, two-Fargate-service topology behind one ALB, with RDS in private subnets. Documented in `infra/terraform/` and `infra/terraform/README.md`.

Key choices:

1. **Compute: ECS Fargate** for both `@dnca/api` and `@dnca/web`.
   - Trade-off vs. Lambda + API Gateway: lower cold-start latency from East Africa, simpler local→prod parity (the same `docker run` works), no per-request billing surprise.
   - Trade-off vs. App Runner: ECS gives finer-grained networking control we'll want for the Sprint 5 NAT-Gateway tightening; App Runner abstracts that away.

2. **No NAT Gateway at MVP.** Fargate tasks sit in public subnets with `assign_public_ip = true` so they can pull from ECR. Security groups constrain ingress to the ALB only. Saves ~$32/mo. Sprint 5 follow-on tightens to private subnets + NAT once the first operator is live, gated on whether their auditor flags public-IP-on-compute as a finding.

3. **Single ALB with host-based routing.**
   - Default → `web` target group
   - `Host = api.<operator>.dnca.aero` → `api` target group
   - Two ALBs would be cleaner but adds ~$16/mo without a corresponding operational benefit at MVP scale.

4. **RDS Postgres 15 in private subnets only.**
   - `rds.force_ssl = 1` parameter group on every connection
   - Multi-AZ in `prod`; single-AZ in `dev`/`staging`
   - gp3 storage with autoscaling to 100 GiB
   - 7-day automated backup retention (the LIVE window; KCARs 5y archive lives in S3 + Glacier in Sprint 5)
   - Master password generated via `random_password`, written to Secrets Manager; the application reads via the ECS task's `secrets` block — credentials never in env vars on disk.

5. **Secrets Manager for everything sensitive.** `DATABASE_URL`, `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`, `ANTHROPIC_API_KEY`. The task execution role gets `GetSecretValue` for exactly these four ARNs — nothing else.

6. **HTTPS conditional on ACM cert ARN.** Initial bring-up runs HTTP only so DNS + cert provisioning can happen out-of-band; once `var.acm_certificate_arn` is set, the HTTPS listener materialises on re-apply.

7. **Single-replica Fargate services at MVP.** `desired_count = 1`. ECS health checks + the ALB target-group deregistration delay keep the deploy disruption window <60s. Raise to 2 before the first operator goes live.

8. **Local Terraform state, with S3 backend ready to enable.** The `backend "s3"` block is scaffolded in `versions.tf` but commented out — uncommenting requires bootstrapping the state bucket + DynamoDB lock table out-of-band first. For a single engineer + single deployment, local state is fine; flip the switch before adding a second deployment or a second engineer.

## Image strategy

Each service ships from its own ECR repo. Multi-stage Dockerfiles in `apps/api/Dockerfile` and `apps/web/Dockerfile`:

- `apps/api`: Node 22-alpine, install workspace deps via pnpm, copy source, run with `node --import tsx`. Sprint 4 follow-on: pre-compile TS, drop tsx from the runtime image.
- `apps/web`: Node 22-alpine, two-stage build via Next.js `output: 'standalone'` so the runtime image carries just `.next/standalone/server.js` + static assets. `NEXT_PUBLIC_WORKOS_REDIRECT_URI` must be passed as `--build-arg` because Next inlines `NEXT_PUBLIC_*` into the client bundle at build time.

ECS task definitions reference `:latest` and `lifecycle.ignore_changes = [task_definition]`, so a fresh `docker push` followed by `aws ecs update-service --force-new-deployment` rolls the service forward without a Terraform plan. Provenance-pinned deploys override `var.api_image` / `var.web_image` with a digest reference.

## Cost expectation

| Item                              | Est. monthly cost (af-south-1) |
| --------------------------------- | ------------------------------ |
| RDS db.t4g.micro multi-AZ         | ~$30                           |
| 2× Fargate 0.25 vCPU/0.5 GB       | ~$15                           |
| ALB                               | ~$16                           |
| ECR storage (10 images × 2 repos) | ~$2                            |
| Secrets Manager (4 secrets)       | ~$2                            |
| CloudWatch logs (30-day)          | ~$2–5                          |
| Data transfer (low MVP)           | ~$5–15                         |
| **Total**                         | **~$70–85**                    |

NAT Gateway would add ~$32/mo if reintroduced. CloudFront fronting the web tier would add ~$1/GB egress on top of the ALB. WAF would add ~$5/mo + per-request fees.

## Consequences

- Capt. Ng'ong'a can bring up an operator deployment end-to-end with `terraform apply` + two `docker push` commands.
- The deployment is reproducible: a second operator gets the same topology by copying `terraform.tfvars`, changing the `operator_short_code`, and re-running. No shared state, no shared blast radius.
- Single Postgres cluster per operator deployment. Cross-operator data isolation is enforced at the RLS layer; cross-operator infrastructure isolation is enforced by separate Terraform states.
- Tear-down is a single `terraform destroy` once `environment = "dev"` is set (production has `deletion_protection = true` on RDS + ALB).

## Things this defers to later sprints

- **NAT Gateway / private compute.** Sprint 5 if auditor-flagged; otherwise YAGNI.
- **WAF.** Sprint 5; opens with a baseline managed rule set.
- **CloudFront.** Defer until first complaint about cold-cache latency from East Africa.
- **S3 + Glacier for KCAA-export + audit-log long-term archive.** Sprint 5 (the 5-year retention obligation).
- **GitHub Actions CI/CD.** The push + update-service commands above are scripted but not yet wired through a workflow; one-shot manual deploys are fine while the platform has one engineer.
- **Bastion / VPN for DB access.** Sprint 5; today the runbook says "temporarily allow your IP on the RDS SG, then revoke", which is fine for a single engineer with one-off migration tasks but doesn't scale.
- **Observability beyond CloudWatch.** OpenTelemetry + Grafana Cloud is the target stack per CLAUDE.md; Sprint 5.

## Cross-references

- ADR 0002 — Postgres RLS as the multi-tenancy boundary (preserved end-to-end)
- ADR 0007 — Fastify backend (this is what Fargate `api` runs)
- ADR 0008 — WorkOS auth (env wiring + Secrets Manager flow)
- ADR 0009 — AWS af-south-1 + Kenya DPA 2019 residency

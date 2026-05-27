# 0009 — AWS `af-south-1` (Cape Town) for production hosting

**Status:** Accepted
**Date:** 2026-05-24
**Deciders:** Capt. Dan Moi Ng'ong'a; Claude Code agent

## Context

CLAUDE.md left production hosting open between AWS `af-south-1` (Cape Town) and Azure South Africa North. Capt. Ng'ong'a confirmed AWS in-session.

The deciding constraint is **Kenya Data Protection Act 2019 data residency** — pilot training records are personal data, DNCA is the controller, and the ODPC registration must declare where processing happens. Cape Town meets the "feasible African region" standard; Frankfurt / US-East do not under typical interpretations.

## Decision

**AWS `af-south-1`** for the operator-MVP runtime.

## Why AWS over Azure

- More mature regional service set (RDS, S3 Object Lock, EventBridge, CloudWatch, IAM, SSM Parameter Store, KMS).
- Larger talent pool in Nairobi for AWS than for Azure when DNCA needs to subcontract DevOps work.
- Postgres on RDS is the default fit for ADR 0002 (RLS multi-tenancy) and ADR 0003 (audit log via triggers).
- S3 Object Lock provides WORM storage for the audit-log archive — the strongest tamper-evidence story available.

## Service map (Sprint 5 target)

| Concern        | AWS service                                     | Notes                                                            |
| -------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| Database       | RDS Postgres 15, single-AZ initially            | `db.t4g.small`; promote to Multi-AZ before first paying operator |
| App            | ECS Fargate or App Runner (TBD Sprint 5)        | Fastify container; behind ALB                                    |
| Object storage | S3 with Object Lock                             | Operator documents, KCAA exports, audit-log archive              |
| Secrets        | Secrets Manager                                 | WorkOS API key, Anthropic API key, DB credentials                |
| Observability  | CloudWatch Logs + OpenTelemetry → Grafana Cloud | Per-operator dashboards under DNCA Grafana org                   |
| CI/CD          | GitHub Actions → ECR push → Fargate deploy      | Manual production-promotion gate per CLAUDE.md                   |
| DNS            | Route 53 + AWS-managed cert                     | One subdomain per operator (e.g. `jak.dnca.aero`)                |

## Consequences

- All operator personal data lives in `af-south-1`. Backups stay in `af-south-1` (RDS automated snapshots). Cross-region replication is OFF.
- The Vercel demo (Frankfurt) holds no real operator data — that constraint is enforced by it loading from deterministic fixtures, not from a database.
- Demo (Vercel) and production (AWS) are separate Vercel-project / AWS-account / GitHub-environment trees. They share code via the same `main` branch but separate deploy pipelines.
- Sprint 5 work: `infra/terraform/` Terraform modules for VPC, RDS, ECS/App Runner, S3, IAM, Secrets Manager.

## Cost estimate (per operator, before traffic)

- RDS `db.t4g.small`: ~$30/month
- App hosting (App Runner 0.5 vCPU or Fargate equivalent): ~$25/month
- S3 + Object Lock: ~$5/month
- CloudWatch + OpenTelemetry: ~$10/month
- **Total: ~$70/month per operator** — well below the Phase 3 ($25–40k/yr) recurring fee.

Infra is not the constraint.

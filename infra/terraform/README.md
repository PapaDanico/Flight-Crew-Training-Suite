# DNCA Flight Crew Training Suite — Terraform (AWS af-south-1)

Operational-MVP deployment topology. Stands up everything needed to run one operator's deployment on AWS af-south-1 (Cape Town) per ADR 0009 (Kenya DPA 2019 residency).

## Topology

```
                            ┌──────────────────┐
                            │   ALB (public)   │
                            │  80 + 443 (opt)  │
                            └────────┬─────────┘
                                     │
                  ┌──────────────────┴──────────────────┐
                  │                                     │
            host: api.*                           default → web
                  │                                     │
        ┌─────────▼────────┐                  ┌─────────▼────────┐
        │  Fargate: api    │                  │  Fargate: web    │
        │  @dnca/api:latest│                  │  @dnca/web:latest│
        └─────────┬────────┘                  └─────────┬────────┘
                  │                                     │
                  └──────────────────┬──────────────────┘
                                     │
                              ┌──────▼──────┐
                              │   RDS PG15  │ (private subnets only)
                              └─────────────┘
```

- **VPC** `10.20.0.0/16`, 2 public + 2 private subnets across 2 AZs
- **No NAT Gateway.** Fargate tasks sit in public subnets with `assign_public_ip = true` to pull from ECR. Security groups constrain inbound to the ALB only. Saves ~$32/mo; tighten to private subnets + NAT in Sprint 5 if an auditor flags it.
- **ALB** with HTTP listener; HTTPS materialises when `acm_certificate_arn` is set
- **ECR** repos for api + web with `:latest` rolling tag and 10-image retention
- **Secrets Manager** for `DATABASE_URL`, `WORKOS_API_KEY`, `WORKOS_COOKIE_PASSWORD`, `ANTHROPIC_API_KEY`
- **CloudWatch** log groups, 30-day retention
- **RDS Postgres 15**, `rds.force_ssl = 1`, multi-AZ in prod, encrypted at rest, gp3 with autoscaling to 100 GiB, 7-day automated backups

Sized for MVP: `db.t4g.micro`, 0.25 vCPU / 0.5 GB per Fargate task, single replica per service. Expect ~$50–80/mo at this size in af-south-1.

## Bring-up

Prerequisites:

- Terraform `>= 1.6.0`
- AWS CLI configured for an IAM principal with admin or platform-deployment policies
- A WorkOS project + AuthKit configured with the production redirect URI

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars

terraform init
terraform plan
terraform apply
```

First apply takes ~15 minutes (RDS multi-AZ is the slow path). Once green, push the first image to ECR — see _Image push + deploy_ below.

## Image push + deploy

```bash
AWS_REGION=af-south-1
ECR_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ECR_API=$(terraform -chdir=infra/terraform output -raw ecr_api_repository_url)
ECR_WEB=$(terraform -chdir=infra/terraform output -raw ecr_web_repository_url)

aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com"

# Build from the repo root so the workspace context is visible.
docker build -f apps/api/Dockerfile -t "$ECR_API:latest" .
docker push "$ECR_API:latest"

docker build -f apps/web/Dockerfile -t "$ECR_WEB:latest" \
  --build-arg NEXT_PUBLIC_WORKOS_REDIRECT_URI="https://app.ifly-demo.dnca.aero/callback" .
docker push "$ECR_WEB:latest"

# Force the services to pick up the new image.
CLUSTER=$(terraform -chdir=infra/terraform output -raw ecs_cluster_name)
aws ecs update-service --cluster "$CLUSTER" --service "$(terraform -chdir=infra/terraform output -raw ecs_api_service_name)" --force-new-deployment
aws ecs update-service --cluster "$CLUSTER" --service "$(terraform -chdir=infra/terraform output -raw ecs_web_service_name)" --force-new-deployment
```

## Initial DB migration

The bootstrap migration creates the RLS roles + audit triggers. Run it via a one-off ECS task or from a bastion / your laptop on a port-forward (DB is private):

```bash
# Option A: rds-data API (if enabled) or via an ECS exec session
# Option B: SSM Session Manager to a Fargate task with psql installed

# Simple path: temporarily allow your IP on the RDS security group,
# tunnel through, run psql, then revoke the rule.
DB_URL=$(aws secretsmanager get-secret-value --secret-id "${OPERATOR}-prod-database-url" --query SecretString --output text)
psql "$DB_URL" -v ON_ERROR_STOP=1 -f infra/migrations/0001_initial.sql
psql "$DB_URL" -v ON_ERROR_STOP=1 -f infra/migrations/0002_fleet_variant_b737.sql

# Seed the operator + WorkOS organisation mapping
psql "$DB_URL" <<SQL
INSERT INTO operators (id, legal_name, trading_name, short_code, aoc_number,
                       accountable_manager_name, accountable_manager_email, config)
VALUES (
  gen_random_uuid(), 'I-Fly Air Solutions Ltd', 'I-Fly', 'IFLY',
  'KE-AOC-XXX', 'Capt. Operator HoT', 'hot@ifly.example',
  '{"workosOrganizationId":"org_XXXX"}'::jsonb
);
SQL
```

## DNS + TLS

1. Request an ACM cert in af-south-1 covering `api.<host>.dnca.aero` and `app.<host>.dnca.aero`.
2. Validate via DNS in your Route 53 hosted zone.
3. Set `acm_certificate_arn` in `terraform.tfvars`, re-apply — the HTTPS listener materialises.
4. Create Route 53 ALIAS records:
   - `api.<host>.dnca.aero` → ALB DNS name
   - `app.<host>.dnca.aero` → ALB DNS name
5. Confirm sign-in flow: visit `https://app.<host>.dnca.aero/login` → AuthKit → back to app.

## State backend

For single-operator MVP work, local state is acceptable. Before adding a second engineer or a second operator deployment:

1. Run `infra/terraform/bootstrap-state.sh` (TBD) to create the state S3 bucket + DynamoDB lock table.
2. Uncomment the `backend "s3"` block in `versions.tf`.
3. `terraform init -migrate-state`.

## Tear down

```bash
terraform destroy
```

Production guards (`deletion_protection = true` on RDS + ALB in the `prod` environment) will block destroy. Set `environment = "dev"` and re-apply first, then destroy.

## What this Terraform does NOT do (yet)

- **NAT Gateway / private compute.** ECS in public subnets with strict SGs is the operational-MVP trade-off; tighten in Sprint 5.
- **WAF.** Add `aws_wafv2_web_acl` before opening sign-up to non-pilot users.
- **CloudFront in front of web.** Defer until first cold-cache page latency from East Africa becomes a complaint.
- **S3 + Glacier for long-term audit-log + KCAA-export archive.** Sprint 5.
- **CI/CD pipeline.** The image-push + ECS-update commands above are scripted but not yet automated through GitHub Actions.

See ADR 0010 for the topology rationale.

#!/usr/bin/env bash
#
# deploy.sh — build, push, and roll forward both services with a git-SHA
# image tag. Solves the audit finding that `:latest` lookups erase
# provenance: every running task is identifiable to the commit that
# built it via `aws ecs describe-tasks` -> the image field.
#
# Usage (from repo root):
#   infra/terraform/deploy.sh
#
# Required env:
#   AWS_REGION          — defaults to af-south-1
#   AWS_PROFILE         — your AWS CLI profile (optional)
#
# The script reads ECR repo URLs and ECS service names from terraform
# outputs; an `apply` must have happened at least once first.

set -euo pipefail

cd "$(dirname "$0")/../.."
ROOT="$(pwd)"
AWS_REGION="${AWS_REGION:-af-south-1}"

# Resolve identifiers from terraform state.
TF="terraform -chdir=infra/terraform"
ECR_API=$($TF output -raw ecr_api_repository_url)
ECR_WEB=$($TF output -raw ecr_web_repository_url)
CLUSTER=$($TF output -raw ecs_cluster_name)
API_SVC=$($TF output -raw ecs_api_service_name)
WEB_SVC=$($TF output -raw ecs_web_service_name)

# Image tag = short git SHA. Append -dirty if there are uncommitted
# changes so a slip can't pretend to be the committed state.
SHA="$(git rev-parse --short HEAD)"
if ! git diff-index --quiet HEAD --; then
  SHA="${SHA}-dirty"
fi
echo "==> Deploying SHA: $SHA"

# ECR login.
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "${ACCOUNT}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Build + tag with BOTH :latest (for the ECS task-def baseline) and
# :<sha> (for provenance).
echo "==> Building api image"
docker build -f apps/api/Dockerfile -t "$ECR_API:latest" -t "$ECR_API:$SHA" "$ROOT"
docker push "$ECR_API:latest"
docker push "$ECR_API:$SHA"

echo "==> Building web image"
# NEXT_PUBLIC_WORKOS_REDIRECT_URI is inlined into the client bundle at
# build time; pass through so AuthKit's sign-in flow knows where to
# redirect back to.
docker build \
  -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_WORKOS_REDIRECT_URI="${NEXT_PUBLIC_WORKOS_REDIRECT_URI:-}" \
  -t "$ECR_WEB:latest" -t "$ECR_WEB:$SHA" "$ROOT"
docker push "$ECR_WEB:latest"
docker push "$ECR_WEB:$SHA"

# Force ECS to roll the services forward. The task definitions use
# :latest as the image reference, so a `--force-new-deployment` pulls
# the newest digest. The :<sha> tag stays in ECR so you can pin a task
# def to a specific commit later via var.api_image / var.web_image.
echo "==> Rolling api service"
aws ecs update-service \
  --region "$AWS_REGION" \
  --cluster "$CLUSTER" \
  --service "$API_SVC" \
  --force-new-deployment \
  >/dev/null

echo "==> Rolling web service"
aws ecs update-service \
  --region "$AWS_REGION" \
  --cluster "$CLUSTER" \
  --service "$WEB_SVC" \
  --force-new-deployment \
  >/dev/null

echo "==> Deploy of $SHA started. Watch progress:"
echo "    aws ecs wait services-stable --cluster $CLUSTER --services $API_SVC $WEB_SVC"

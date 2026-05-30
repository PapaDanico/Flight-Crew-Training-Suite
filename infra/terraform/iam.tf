# ECS task execution role. AWS assumes this role to PULL the image from
# ECR, READ secrets from Secrets Manager, and WRITE logs to CloudWatch
# at task-start time — distinct from the application's runtime role.
resource "aws_iam_role" "task_execution" {
  name = "${local.name_prefix}-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "task_execution_managed" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Grant the execution role permission to read each app secret.
resource "aws_iam_role_policy" "task_execution_secrets" {
  name = "${local.name_prefix}-task-execution-secrets"
  role = aws_iam_role.task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue"]
      Resource = [
        aws_secretsmanager_secret.database_url.arn,
        aws_secretsmanager_secret.anthropic_api_key.arn,
        aws_secretsmanager_secret.workos_api_key.arn,
        aws_secretsmanager_secret.workos_cookie_password.arn,
      ]
    }]
  })
}

# Task role: assumed by the RUNNING application. Empty for the MVP —
# the app talks only to Postgres (via DATABASE_URL) and outbound APIs
# (WorkOS, Anthropic) with already-scoped tokens. When the app starts
# reading from S3 (object storage for OM docs, Sprint 5), grant S3
# permissions here.
resource "aws_iam_role" "task" {
  name = "${local.name_prefix}-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

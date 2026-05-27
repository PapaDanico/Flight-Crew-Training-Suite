resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/ecs/${local.name_prefix}-api"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "web" {
  name              = "/aws/ecs/${local.name_prefix}-web"
  retention_in_days = 30
}

locals {
  # If api_image / web_image is unset, point the task def at the ECR repo
  # at the `:latest` tag. The first apply spins up the repos; you then
  # build + push the image and the service rolls forward.
  effective_api_image = coalesce(
    var.api_image,
    "${aws_ecr_repository.api.repository_url}:latest",
  )
  effective_web_image = coalesce(
    var.web_image,
    "${aws_ecr_repository.web.repository_url}:latest",
  )
}

# ----- api task definition ------------------------------------------------
resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name_prefix}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name  = "api"
    image = local.effective_api_image

    portMappings = [{
      containerPort = 3001
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3001" },
      { name = "HOST", value = "0.0.0.0" },
      { name = "LOG_LEVEL", value = "info" },
      { name = "CORS_ORIGINS", value = "https://${coalesce(var.web_host_name, aws_lb.main.dns_name)}" },
      { name = "WORKOS_CLIENT_ID", value = var.workos_client_id },
    ]

    secrets = [
      { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.database_url.arn },
      { name = "WORKOS_API_KEY", valueFrom = aws_secretsmanager_secret.workos_api_key.arn },
      { name = "WORKOS_COOKIE_PASSWORD", valueFrom = aws_secretsmanager_secret.workos_cookie_password.arn },
      { name = "ANTHROPIC_API_KEY", valueFrom = aws_secretsmanager_secret.anthropic_api_key.arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.api.name
        awslogs-region        = var.region
        awslogs-stream-prefix = "api"
      }
    }

    essential = true
  }])
}

# ----- web task definition ------------------------------------------------
resource "aws_ecs_task_definition" "web" {
  family                   = "${local.name_prefix}-web"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name  = "web"
    image = local.effective_web_image

    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "3000" },
      { name = "HOSTNAME", value = "0.0.0.0" },
      { name = "NEXT_TELEMETRY_DISABLED", value = "1" },
      # API_BASE_URL points at the api via host header; the ALB routes
      # api.* to the api target group.
      { name = "API_BASE_URL", value = "https://${coalesce(var.api_host_name, aws_lb.main.dns_name)}" },
      { name = "WORKOS_CLIENT_ID", value = var.workos_client_id },
      { name = "NEXT_PUBLIC_WORKOS_REDIRECT_URI", value = var.workos_redirect_uri },
    ]

    secrets = [
      { name = "WORKOS_API_KEY", valueFrom = aws_secretsmanager_secret.workos_api_key.arn },
      { name = "WORKOS_COOKIE_PASSWORD", valueFrom = aws_secretsmanager_secret.workos_cookie_password.arn },
      { name = "ANTHROPIC_API_KEY", valueFrom = aws_secretsmanager_secret.anthropic_api_key.arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.web.name
        awslogs-region        = var.region
        awslogs-stream-prefix = "web"
      }
    }

    essential = true
  }])
}

# ----- api service --------------------------------------------------------
resource "aws_ecs_service" "api" {
  name            = "${local.name_prefix}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3001
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  # Image rolls forward on a fresh push to ECR — the task def references
  # :latest. For provenance, deploy by updating var.api_image to a
  # digest-pinned ref and re-running terraform apply.
  lifecycle {
    ignore_changes = [task_definition]
  }

  depends_on = [aws_lb_listener.http]
}

# ----- web service --------------------------------------------------------
resource "aws_ecs_service" "web" {
  name            = "${local.name_prefix}-web"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.web.arn
  desired_count   = var.web_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.web.arn
    container_name   = "web"
    container_port   = 3000
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  lifecycle {
    ignore_changes = [task_definition]
  }

  depends_on = [aws_lb_listener.http]
}

resource "random_password" "db_master" {
  length  = 32
  special = false # Postgres URL-safe; Secrets Manager handles encoding
}

resource "aws_db_subnet_group" "main" {
  name        = "${local.name_prefix}-db"
  description = "RDS subnet group (private subnets only)"
  subnet_ids  = aws_subnet.private[*].id
  tags        = { Name = "${local.name_prefix}-db-subnets" }
}

resource "aws_db_parameter_group" "postgres15" {
  name        = "${local.name_prefix}-pg15"
  family      = "postgres15"
  description = "Postgres 15 baseline; enforce SSL on every connection."

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}

resource "aws_db_instance" "main" {
  identifier     = "${local.name_prefix}-pg"
  engine         = "postgres"
  engine_version = "15"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage_gb
  max_allocated_storage = var.db_max_allocated_storage_gb
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "fcts"
  username = "fctsadmin"
  password = random_password.db_master.result
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.postgres15.name
  publicly_accessible    = false
  multi_az               = var.environment == "prod"

  backup_retention_period = var.db_backup_retention_days
  backup_window           = "01:00-02:00" # UTC; ~04:00 EAT
  maintenance_window      = "sat:02:30-sat:03:30"
  deletion_protection     = var.environment == "prod"
  skip_final_snapshot     = var.environment != "prod"

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  apply_immediately = false

  tags = { Name = "${local.name_prefix}-pg" }
}

# Connection URL stored in Secrets Manager. The migration runbook + ECS
# task definition both consume this secret rather than embedding the
# password.
locals {
  database_url = "postgres://${aws_db_instance.main.username}:${random_password.db_master.result}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
}

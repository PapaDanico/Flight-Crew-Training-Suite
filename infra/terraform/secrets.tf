# Secrets Manager entries. Each is materialised even when the variable
# is empty (initial bring-up); rotate in real values via the AWS CLI:
#
#   aws secretsmanager put-secret-value \
#     --secret-id ${local.name_prefix}-anthropic-api-key \
#     --secret-string 'sk-ant-...'

resource "aws_secretsmanager_secret" "database_url" {
  name        = "${local.name_prefix}-database-url"
  description = "Postgres connection string for @dnca/api. Rotated when the RDS master password changes."
  # Recovery window of 0 lets terraform destroy + re-create cleanly during
  # MVP bring-up. Raise before production go-live.
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = local.database_url
}

resource "aws_secretsmanager_secret" "anthropic_api_key" {
  name                    = "${local.name_prefix}-anthropic-api-key"
  description             = "Anthropic Claude API key for AI assessment generation."
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "anthropic_api_key" {
  secret_id     = aws_secretsmanager_secret.anthropic_api_key.id
  secret_string = var.anthropic_api_key
  lifecycle { ignore_changes = [secret_string] }
}

resource "aws_secretsmanager_secret" "workos_api_key" {
  name                    = "${local.name_prefix}-workos-api-key"
  description             = "WorkOS Management API secret (sk_...)."
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "workos_api_key" {
  secret_id     = aws_secretsmanager_secret.workos_api_key.id
  secret_string = var.workos_api_key
  lifecycle { ignore_changes = [secret_string] }
}

resource "aws_secretsmanager_secret" "workos_cookie_password" {
  name                    = "${local.name_prefix}-workos-cookie-password"
  description             = "Session cookie encryption key (>=32 chars)."
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "workos_cookie_password" {
  secret_id     = aws_secretsmanager_secret.workos_cookie_password.id
  secret_string = var.workos_cookie_password
  lifecycle { ignore_changes = [secret_string] }
}

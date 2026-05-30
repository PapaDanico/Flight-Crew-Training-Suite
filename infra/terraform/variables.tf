variable "region" {
  description = "AWS region. ADR 0009 anchors production to af-south-1 (Cape Town) for Kenya DPA 2019 residency; override only for non-production sandboxes."
  type        = string
  default     = "af-south-1"
}

variable "environment" {
  description = "Deployment environment: dev | staging | prod. Used in resource names + tags."
  type        = string
  default     = "prod"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of dev | staging | prod."
  }
}

variable "operator_short_code" {
  description = "Operator short code used as a name prefix (e.g. jak-demo, ifly-demo). Lower-case kebab-case."
  type        = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,30}$", var.operator_short_code))
    error_message = "operator_short_code must be lowercase kebab-case, 2-31 chars, starting with a letter."
  }
}

variable "vpc_cidr" {
  description = "Primary CIDR for the VPC. /16 leaves room for future expansion."
  type        = string
  default     = "10.20.0.0/16"
}

variable "availability_zones_count" {
  description = "Number of AZs to spread across. RDS requires >=2 for the subnet group; ECS uses both."
  type        = number
  default     = 2
}

variable "db_instance_class" {
  description = "RDS instance class. db.t4g.micro is the operational-MVP floor; size up before live data."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage_gb" {
  description = "RDS allocated storage in GiB. gp3 storage auto-scales to the max below."
  type        = number
  default     = 20
}

variable "db_max_allocated_storage_gb" {
  description = "RDS storage autoscaling ceiling."
  type        = number
  default     = 100
}

variable "db_backup_retention_days" {
  description = "Automated backup retention. KCARs require 5y training-record retention; this is the live RDS window, not the long-term archive (S3 + Glacier in Sprint 5)."
  type        = number
  default     = 7
}

variable "api_image" {
  description = "Container image for @dnca/api. Default = ECR repo built by infra/terraform itself; override to a fixed digest in production deploys."
  type        = string
  default     = ""
}

variable "web_image" {
  description = "Container image for @dnca/web."
  type        = string
  default     = ""
}

variable "api_desired_count" {
  description = "Number of api task replicas. 1 = MVP single-AZ; raise to 2 once the deployment is live."
  type        = number
  default     = 1
}

variable "web_desired_count" {
  description = "Number of web task replicas."
  type        = number
  default     = 1
}

variable "api_host_name" {
  description = "Host header that routes to the api target group (e.g. api.ifly-demo.dnca.aero). Leave empty to expose api at ALB DNS only via path rule /api*."
  type        = string
  default     = ""
}

variable "web_host_name" {
  description = "Host header that routes to the web target group (e.g. app.ifly-demo.dnca.aero). Defaults to the ALB DNS catch-all."
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "Pre-issued ACM cert ARN for the ALB HTTPS listener. Leave empty during initial bring-up (HTTP only). Issue cert + provide ARN, then re-apply."
  type        = string
  default     = ""
}

variable "anthropic_api_key" {
  description = "Anthropic API key written to Secrets Manager. Leave empty to provision the secret without a value (rotate in via CLI)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "workos_api_key" {
  description = "WorkOS Management API key (sk_...)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "workos_client_id" {
  description = "WorkOS public client id (client_...)."
  type        = string
  default     = ""
}

variable "workos_cookie_password" {
  description = ">=32 char secret for encrypting the session cookie. Generate with `openssl rand -base64 32`."
  type        = string
  default     = ""
  sensitive   = true
}

variable "workos_redirect_uri" {
  description = "OAuth callback URL the web ships to AuthKit. Must match the WorkOS dashboard exactly."
  type        = string
  default     = ""
}

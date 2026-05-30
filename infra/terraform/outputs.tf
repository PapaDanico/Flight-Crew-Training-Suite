output "alb_dns_name" {
  description = "Public DNS name of the ALB. CNAME your web + api hostnames here."
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Hosted zone id of the ALB for Route53 ALIAS records."
  value       = aws_lb.main.zone_id
}

output "ecr_api_repository_url" {
  description = "ECR repo URL for @dnca/api. Push images here."
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_web_repository_url" {
  description = "ECR repo URL for @dnca/web."
  value       = aws_ecr_repository.web.repository_url
}

output "rds_endpoint" {
  description = "RDS Postgres endpoint (private; only reachable from ECS)."
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "RDS Postgres port."
  value       = aws_db_instance.main.port
}

output "database_url_secret_arn" {
  description = "Secrets Manager ARN containing the Postgres connection URL."
  value       = aws_secretsmanager_secret.database_url.arn
}

output "ecs_cluster_name" {
  description = "ECS cluster name. Use to drive `aws ecs update-service` on roll-forward."
  value       = aws_ecs_cluster.main.name
}

output "ecs_api_service_name" {
  description = "ECS service name for api. Use with `aws ecs update-service --force-new-deployment`."
  value       = aws_ecs_service.api.name
}

output "ecs_web_service_name" {
  description = "ECS service name for web."
  value       = aws_ecs_service.web.name
}

output "rds_security_group_id" {
  description = "RDS security group id. Used by the incident-response runbook for emergency one-off DB access."
  value       = aws_security_group.rds.id
}

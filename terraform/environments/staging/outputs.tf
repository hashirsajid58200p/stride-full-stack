output "alb_dns_name" {
  description = "Public DNS name of the Staging Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "staging_url" {
  description = "Public URL for Staging environment"
  value       = module.route53.fqdn != "" ? "https://${module.route53.fqdn}" : "http://${module.alb.alb_dns_name}"
}

output "client_ecr_repository_url" {
  description = "ECR Repository URL for Staging Client"
  value       = module.ecr.client_repository_url
}

output "server_ecr_repository_url" {
  description = "ECR Repository URL for Staging Server"
  value       = module.ecr.server_repository_url
}

output "asg_name" {
  description = "Name of the Staging Auto Scaling Group"
  value       = module.asg.asg_name
}

output "github_actions_role_arn" {
  description = "IAM Role ARN to configure in GitHub Actions for Staging"
  value       = module.iam.github_actions_role_arn
}

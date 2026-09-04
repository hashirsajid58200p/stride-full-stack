output "alb_dns_name" {
  description = "Public DNS name of the Production Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "production_url" {
  description = "Public URL for Production environment"
  value       = module.route53.fqdn != "" ? "https://${module.route53.fqdn}" : "http://${module.alb.alb_dns_name}"
}

output "client_ecr_repository_url" {
  description = "ECR Repository URL for Production Client"
  value       = module.ecr.client_repository_url
}

output "server_ecr_repository_url" {
  description = "ECR Repository URL for Production Server"
  value       = module.ecr.server_repository_url
}

output "asg_name" {
  description = "Name of the Production Auto Scaling Group"
  value       = module.asg.asg_name
}

output "github_actions_role_arn" {
  description = "IAM Role ARN to configure in GitHub Actions for Production"
  value       = module.iam.github_actions_role_arn
}

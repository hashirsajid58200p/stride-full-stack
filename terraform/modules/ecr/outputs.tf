output "client_repository_url" {
  description = "URL of the client ECR repository"
  value       = aws_ecr_repository.client.repository_url
}

output "server_repository_url" {
  description = "URL of the server ECR repository"
  value       = aws_ecr_repository.server.repository_url
}

output "client_repository_arn" {
  description = "ARN of the client ECR repository"
  value       = aws_ecr_repository.client.arn
}

output "server_repository_arn" {
  description = "ARN of the server ECR repository"
  value       = aws_ecr_repository.server.arn
}

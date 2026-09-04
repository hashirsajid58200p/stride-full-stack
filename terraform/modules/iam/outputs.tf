output "instance_profile_name" {
  description = "Name of the EC2 IAM Instance Profile"
  value       = aws_iam_instance_profile.instance_profile.name
}

output "instance_profile_arn" {
  description = "ARN of the EC2 IAM Instance Profile"
  value       = aws_iam_instance_profile.instance_profile.arn
}

output "instance_role_arn" {
  description = "ARN of the EC2 IAM Role"
  value       = aws_iam_role.instance_role.arn
}

output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions OIDC deployer role"
  value       = length(aws_iam_role.github_actions_role) > 0 ? aws_iam_role.github_actions_role[0].arn : ""
}

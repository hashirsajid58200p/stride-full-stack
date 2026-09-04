output "alb_security_group_id" {
  description = "ID of the ALB Security Group"
  value       = aws_security_group.alb.id
}

output "instance_security_group_id" {
  description = "ID of the EC2 Instance Security Group"
  value       = aws_security_group.instance.id
}

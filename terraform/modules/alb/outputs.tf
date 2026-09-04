output "alb_id" {
  description = "ID of the ALB"
  value       = aws_lb.main.id
}

output "alb_arn" {
  description = "ARN of the ALB"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "DNS name of the ALB"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Canonical hosted zone ID of the ALB (for Route 53 alias)"
  value       = aws_lb.main.zone_id
}

output "client_target_group_arn" {
  description = "ARN of the client target group"
  value       = aws_lb_target_group.client.arn
}

output "server_target_group_arn" {
  description = "ARN of the server target group"
  value       = aws_lb_target_group.server.arn
}

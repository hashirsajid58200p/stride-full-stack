output "certificate_arn" {
  description = "ARN of the validated ACM Certificate"
  value       = length(aws_acm_certificate.cert) > 0 ? aws_acm_certificate.cert[0].arn : ""
}

output "fqdn" {
  description = "Fully Qualified Domain Name routed to ALB"
  value       = length(aws_route53_record.alb_alias_a) > 0 ? aws_route53_record.alb_alias_a[0].fqdn : ""
}

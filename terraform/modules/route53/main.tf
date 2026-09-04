# ====================================================
# Terraform Route 53 & ACM Module for Stride Platform
# DNS Routing, Alias Records, and Automated ACM SSL Validation
# ====================================================

# Query existing Route 53 Hosted Zone for domain
data "aws_route53_zone" "primary" {
  count        = var.domain_name != "" ? 1 : 0
  name         = var.domain_name
  private_zone = false
}

# Request ACM Certificate with SAN wildcard
resource "aws_acm_certificate" "cert" {
  count             = var.domain_name != "" ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"
  ]

  tags = {
    Name        = "${var.project_name}-${var.environment}-cert"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# DNS Validation Records in Route 53
resource "aws_route53_record" "cert_validation" {
  for_each = var.domain_name != "" ? {
    for dvo in aws_acm_certificate.cert[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.primary[0].zone_id
}

# Wait for DNS validation completion
resource "aws_acm_certificate_validation" "cert" {
  count                   = var.domain_name != "" ? 1 : 0
  certificate_arn         = aws_acm_certificate.cert[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# Route 53 Alias Record (IPv4 - A) pointing to ALB
resource "aws_route53_record" "alb_alias_a" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = data.aws_route53_zone.primary[0].zone_id
  name    = var.subdomain != "" ? "${var.subdomain}.${var.domain_name}" : var.domain_name
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# Route 53 Alias Record (IPv6 - AAAA) pointing to ALB
resource "aws_route53_record" "alb_alias_aaaa" {
  count   = var.domain_name != "" ? 1 : 0
  zone_id = data.aws_route53_zone.primary[0].zone_id
  name    = var.subdomain != "" ? "${var.subdomain}.${var.domain_name}" : var.domain_name
  type    = "AAAA"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

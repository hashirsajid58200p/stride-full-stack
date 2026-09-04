variable "project_name" {
  type        = string
  description = "Name of the project"
  default     = "stride"
}

variable "environment" {
  type        = string
  description = "Target environment"
}

variable "domain_name" {
  type        = string
  description = "Root domain name registered or hosted in Route 53 (e.g. stridestore.com)"
  default     = ""
}

variable "subdomain" {
  type        = string
  description = "Subdomain prefix (e.g. 'staging' for staging.stridestore.com or empty for root)"
  default     = ""
}

variable "alb_dns_name" {
  type        = string
  description = "DNS name of the ALB"
}

variable "alb_zone_id" {
  type        = string
  description = "Zone ID of the ALB"
}

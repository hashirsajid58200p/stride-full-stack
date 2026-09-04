variable "project_name" {
  type        = string
  description = "Name of the project"
  default     = "stride"
}

variable "environment" {
  type        = string
  description = "Target environment"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "List of public subnet IDs to place ALB into"
}

variable "security_group_id" {
  type        = string
  description = "Security group ID for the ALB"
}

variable "certificate_arn" {
  type        = string
  description = "ACM Certificate ARN for HTTPS listener (optional, left empty if HTTP-only initial bootstrap)"
  default     = ""
}

variable "project_name" {
  type        = string
  description = "Name of the project"
  default     = "stride"
}

variable "environment" {
  type        = string
  description = "Target environment"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "List of private subnet IDs where EC2 instances will run"
}

variable "security_group_id" {
  type        = string
  description = "Security group ID for ASG EC2 instances"
}

variable "instance_profile_name" {
  type        = string
  description = "IAM instance profile name attached to EC2"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"
  default     = "t3.small"
}

variable "min_size" {
  type        = number
  description = "Minimum number of instances in ASG"
  default     = 2
}

variable "max_size" {
  type        = number
  description = "Maximum number of instances in ASG"
  default     = 6
}

variable "desired_capacity" {
  type        = number
  description = "Desired number of instances in ASG"
  default     = 2
}

variable "min_healthy_percentage" {
  type        = number
  description = "Minimum healthy percentage during rolling instance refresh (50 for staging, 100 for production)"
  default     = 50
}

variable "client_target_group_arn" {
  type        = string
  description = "Target Group ARN for client frontend"
}

variable "server_target_group_arn" {
  type        = string
  description = "Target Group ARN for server backend"
}

variable "client_image_url" {
  type        = string
  description = "ECR image URL for client"
  default     = "nginx:alpine"
}

variable "server_image_url" {
  type        = string
  description = "ECR image URL for server"
  default     = "node:22-alpine"
}

variable "ecr_registry_url" {
  type        = string
  description = "Root URL for ECR registry"
  default     = ""
}

variable "alb_dns_name" {
  type        = string
  description = "DNS name of the ALB"
  default     = "localhost"
}

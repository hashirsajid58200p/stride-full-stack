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
  description = "VPC ID where security groups will be created"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block of the VPC"
}

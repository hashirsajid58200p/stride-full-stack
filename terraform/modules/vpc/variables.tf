variable "project_name" {
  type        = string
  description = "Name of the project (e.g., stride)"
  default     = "stride"
}

variable "environment" {
  type        = string
  description = "Target environment (staging or production)"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "List of Availability Zones to deploy subnets into"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets"
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets"
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

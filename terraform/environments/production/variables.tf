variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Project name"
  default     = "stride"
}

variable "domain_name" {
  type        = string
  description = "Root domain name for Route 53"
  default     = ""
}

variable "subdomain" {
  type        = string
  description = "Subdomain prefix (empty for apex/root domain e.g. stridestore.com, or 'www')"
  default     = ""
}

variable "github_repo" {
  type        = string
  description = "GitHub repository formatted as owner/repo"
  default     = "hashirsajid58200p/stride-full-stack"
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type for production"
  default     = "t3.medium"
}

variable "asg_min_size" {
  type        = number
  description = "Minimum ASG instance count for high availability"
  default     = 2
}

variable "asg_max_size" {
  type        = number
  description = "Maximum ASG instance count during traffic spikes"
  default     = 8
}

variable "asg_desired_capacity" {
  type        = number
  description = "Desired baseline ASG instance count"
  default     = 2
}

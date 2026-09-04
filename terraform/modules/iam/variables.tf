variable "project_name" {
  type        = string
  description = "Name of the project"
  default     = "stride"
}

variable "environment" {
  type        = string
  description = "Target environment"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository formatted as owner/repo (e.g. hashirsajid58200p/stride-full-stack)"
  default     = ""
}

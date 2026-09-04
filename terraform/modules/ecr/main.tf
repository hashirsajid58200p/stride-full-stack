# ====================================================
# Terraform ECR Module for Stride Platform
# Creates Private ECR Repositories with Lifecycle Policies
# ====================================================

# 1. Frontend Client Repository
resource "aws_ecr_repository" "client" {
  name                 = "${var.project_name}-client-${var.environment}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name        = "${var.project_name}-client-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 2. Backend Server Repository
resource "aws_ecr_repository" "server" {
  name                 = "${var.project_name}-server-${var.environment}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name        = "${var.project_name}-server-${var.environment}"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Lifecycle Policy: Keep last 15 tagged images, purge untagged after 7 days
resource "aws_ecr_lifecycle_policy" "client_lifecycle" {
  repository = aws_ecr_repository.client.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep maximum 15 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "sha", "staging", "prod"]
          countType     = "imageCountMoreThan"
          countNumber   = 15
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "server_lifecycle" {
  repository = aws_ecr_repository.server.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep maximum 15 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "sha", "staging", "prod"]
          countType     = "imageCountMoreThan"
          countNumber   = 15
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

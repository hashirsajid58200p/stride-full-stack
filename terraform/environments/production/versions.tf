terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment when remote S3 state backend is created
  # backend "s3" {
  #   bucket         = "stride-terraform-state-production"
  #   key            = "production/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "stride-terraform-locks-production"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "stride"
      Environment = "production"
      ManagedBy   = "Terraform"
    }
  }
}

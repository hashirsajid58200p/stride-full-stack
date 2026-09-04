# ====================================================
# Stride Staging Environment Root Configuration
# ====================================================

data "aws_availability_zones" "available" {
  state = "available"
}

# 1. VPC Module
module "vpc" {
  source = "../../modules/vpc"

  project_name         = var.project_name
  environment          = "staging"
  vpc_cidr             = "10.10.0.0/16"
  availability_zones   = slice(data.aws_availability_zones.available.names, 0, 2)
  public_subnet_cidrs  = ["10.10.1.0/24", "10.10.2.0/24"]
  private_subnet_cidrs = ["10.10.10.0/24", "10.10.20.0/24"]
}

# 2. Security Groups Module
module "security" {
  source = "../../modules/security"

  project_name = var.project_name
  environment  = "staging"
  vpc_id       = module.vpc.vpc_id
  vpc_cidr     = module.vpc.vpc_cidr_block
}

# 3. IAM Module
module "iam" {
  source = "../../modules/iam"

  project_name = var.project_name
  environment  = "staging"
  github_repo  = var.github_repo
}

# 4. ECR Module
module "ecr" {
  source = "../../modules/ecr"

  project_name = var.project_name
  environment  = "staging"
}

# 5. Route 53 & ACM Module (optional domain mapping)
module "route53" {
  source = "../../modules/route53"

  project_name = var.project_name
  environment  = "staging"
  domain_name  = var.domain_name
  subdomain    = var.subdomain
  alb_dns_name = module.alb.alb_dns_name
  alb_zone_id  = module.alb.alb_zone_id
}

# 6. ALB Module
module "alb" {
  source = "../../modules/alb"

  project_name      = var.project_name
  environment       = "staging"
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  security_group_id = module.security.alb_security_group_id
  certificate_arn   = module.route53.certificate_arn
}

# 7. ASG Module
module "asg" {
  source = "../../modules/asg"

  project_name            = var.project_name
  environment             = "staging"
  aws_region              = var.aws_region
  private_subnet_ids      = module.vpc.private_subnet_ids
  security_group_id       = module.security.instance_security_group_id
  instance_profile_name   = module.iam.instance_profile_name
  instance_type           = var.instance_type
  min_size                = var.asg_min_size
  max_size                = var.asg_max_size
  desired_capacity        = var.asg_desired_capacity
  min_healthy_percentage  = 50
  client_target_group_arn = module.alb.client_target_group_arn
  server_target_group_arn = module.alb.server_target_group_arn
  client_image_url        = "${module.ecr.client_repository_url}:staging-latest"
  server_image_url        = "${module.ecr.server_repository_url}:staging-latest"
  ecr_registry_url        = split("/", module.ecr.client_repository_url)[0]
  alb_dns_name            = module.alb.alb_dns_name
}

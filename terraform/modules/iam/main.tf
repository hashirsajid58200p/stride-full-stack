# ====================================================
# Terraform IAM Module for Stride Platform
# Creates Least-Privilege EC2 Instance Profile & GitHub Actions OIDC Role
# ====================================================

# 1. EC2 Instance IAM Role (for ASG container hosts)
resource "aws_iam_role" "instance_role" {
  name = "${var.project_name}-${var.environment}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-ec2-role"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Attach ECR Read-Only policy to allow EC2 to pull Docker images
resource "aws_iam_role_policy_attachment" "ecr_read" {
  role       = aws_iam_role.instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# Attach SSM policy to allow remote shell/debugging via AWS SSM Session Manager
resource "aws_iam_role_policy_attachment" "ssm_managed" {
  role       = aws_iam_role.instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Attach CloudWatch policy for logs & metrics
resource "aws_iam_role_policy_attachment" "cloudwatch_agent" {
  role       = aws_iam_role.instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# Instance Profile used by EC2 Launch Template
resource "aws_iam_instance_profile" "instance_profile" {
  name = "${var.project_name}-${var.environment}-instance-profile"
  role = aws_iam_role.instance_role.name

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 2. GitHub Actions OIDC Role (for automated zero-downtime CI/CD deployment)
data "aws_caller_identity" "current" {}

resource "aws_iam_role" "github_actions_role" {
  count = var.github_repo != "" ? 1 : 0
  name  = "${var.project_name}-${var.environment}-github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRoleWithWebIdentity"
        Effect = "Allow"
        Principal = {
          Federated = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
        }
        Condition = {
          StringLike = {
            "token.actions.githubusercontent.com:sub" : "repo:${var.github_repo}:*"
          }
          StringEquals = {
            "token.actions.githubusercontent.com:aud" : "sts.amazonaws.com"
          }
        }
      }
    ]
  })

  tags = {
    Name        = "${var.project_name}-${var.environment}-github-actions-role"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# ECR Push permissions for GitHub Actions
resource "aws_iam_role_policy_attachment" "github_ecr_power_user" {
  count      = var.github_repo != "" ? 1 : 0
  role       = aws_iam_role.github_actions_role[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
}

# Custom policy for triggering ASG instance refresh and checking deployment health
resource "aws_iam_policy" "deployer_policy" {
  count       = var.github_repo != "" ? 1 : 0
  name        = "${var.project_name}-${var.environment}-deployer-policy"
  description = "Permissions for GitHub Actions to trigger ASG instance refresh and check target groups"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "autoscaling:StartInstanceRefresh",
          "autoscaling:DescribeInstanceRefreshes",
          "autoscaling:CancelInstanceRefresh",
          "autoscaling:DescribeAutoScalingGroups",
          "elasticloadbalancing:DescribeTargetHealth",
          "elasticloadbalancing:DescribeTargetGroups"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_deployer_attach" {
  count      = var.github_repo != "" ? 1 : 0
  role       = aws_iam_role.github_actions_role[0].name
  policy_arn = aws_iam_policy.deployer_policy[0].arn
}

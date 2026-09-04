# ====================================================
# Terraform Security Group Module for Stride Platform
# Implements Strict Least Privilege Network Ingress/Egress
# ====================================================

# 1. Application Load Balancer Security Group
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-${var.environment}-alb-sg"
  description = "Controls inbound traffic to ALB from public internet"
  vpc_id      = var.vpc_id

  # Inbound HTTP from anywhere
  ingress {
    description      = "Allow HTTP inbound from anywhere"
    from_port        = 80
    to_port          = 80
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  # Inbound HTTPS from anywhere
  ingress {
    description      = "Allow HTTPS inbound from anywhere"
    from_port        = 443
    to_port          = 443
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  # Egress to ASG EC2 instances on Client (80) & API Server (5000)
  egress {
    description     = "Outbound to EC2 instances"
    from_port       = 0
    to_port         = 0
    protocol        = "-1"
    cidr_blocks     = [var.vpc_cidr]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-alb-sg"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 2. Auto Scaling Group EC2 Instances Security Group
resource "aws_security_group" "instance" {
  name        = "${var.project_name}-${var.environment}-instance-sg"
  description = "Controls inbound traffic to EC2 instances strictly from ALB"
  vpc_id      = var.vpc_id

  # Inbound Frontend port 80 strictly from ALB Security Group
  ingress {
    description     = "Allow traffic to frontend client container only from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Inbound Backend API port 5000 strictly from ALB Security Group
  ingress {
    description     = "Allow traffic to backend API container only from ALB"
    from_port       = 5000
    to_port         = 5000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow intra-instance communication (e.g., redis or container inter-talk)
  ingress {
    description = "Allow internal instance self communication"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  # Outbound to internet (via NAT Gateway) for ECR image pulls, Supabase, Stripe, etc.
  egress {
    description      = "Allow all outbound traffic via NAT"
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-instance-sg"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# ====================================================
# Terraform ALB Module for Stride Platform
# Public Application Load Balancer with Target Groups & SSL Termination
# ====================================================

resource "aws_lb" "main" {
  name               = "${var.project_name}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "production" ? true : false

  tags = {
    Name        = "${var.project_name}-${var.environment}-alb"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 1. Target Group for Client Frontend (Nginx on Port 80)
resource "aws_lb_target_group" "client" {
  name                 = "${var.project_name}-${var.environment}-client-tg"
  port                 = 80
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "instance"
  deregistration_delay = 30

  health_check {
    enabled             = true
    path                = "/healthz"
    port                = "80"
    protocol            = "HTTP"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-client-tg"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 2. Target Group for API Server & WebSockets (Port 5000)
resource "aws_lb_target_group" "server" {
  name                 = "${var.project_name}-${var.environment}-server-tg"
  port                 = 5000
  protocol             = "HTTP"
  vpc_id               = var.vpc_id
  target_type          = "instance"
  deregistration_delay = 30

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400
    enabled         = true
  }

  health_check {
    enabled             = true
    path                = "/healthz"
    port                = "5000"
    protocol            = "HTTP"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-server-tg"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# HTTP Listener (Redirects to HTTPS if certificate provided, else forwards to client)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  dynamic "default_action" {
    for_each = var.certificate_arn != "" ? [1] : []
    content {
      type = "redirect"
      redirect {
        port        = "443"
        protocol    = "HTTPS"
        status_code = "HTTP_301"
      }
    }
  }

  dynamic "default_action" {
    for_each = var.certificate_arn == "" ? [1] : []
    content {
      type             = "forward"
      target_group_arn = aws_lb_target_group.client.arn
    }
  }
}

# HTTPS Listener (Active when ACM certificate is configured)
resource "aws_lb_listener" "https" {
  count             = var.certificate_arn != "" ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.client.arn
  }
}

# Listener Rule: Forward /api/* to backend target group
resource "aws_lb_listener_rule" "api_rule_https" {
  count        = var.certificate_arn != "" ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.server.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

resource "aws_lb_listener_rule" "api_rule_http" {
  count        = var.certificate_arn == "" ? 1 : 0
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.server.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# Listener Rule: Forward /socket.io/* to backend target group with sticky sessions
resource "aws_lb_listener_rule" "socket_rule_https" {
  count        = var.certificate_arn != "" ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.server.arn
  }

  condition {
    path_pattern {
      values = ["/socket.io/*"]
    }
  }
}

resource "aws_lb_listener_rule" "socket_rule_http" {
  count        = var.certificate_arn == "" ? 1 : 0
  listener_arn = aws_lb_listener.http.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.server.arn
  }

  condition {
    path_pattern {
      values = ["/socket.io/*"]
    }
  }
}

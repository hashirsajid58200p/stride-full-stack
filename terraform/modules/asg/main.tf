# ====================================================
# Terraform ASG Module for Stride Platform
# Auto Scaling Group, Launch Template, Dynamic Scaling & Rolling Updates
# ====================================================

# Latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023.*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# User Data script template
locals {
  user_data = <<-EOF
    #!/bin/bash
    set -e
    exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

    echo "=== [1/5] Updating packages & installing Docker ==="
    dnf update -y
    dnf install -y docker awscli git

    systemctl enable --now docker
    usermod -aG docker ec2-user

    echo "=== [2/5] Installing Docker Compose plugin ==="
    DOCKER_CONFIG=/usr/local/lib/docker
    mkdir -p $DOCKER_CONFIG/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/download/v2.29.2/docker-compose-linux-x86_64" -o $DOCKER_CONFIG/cli-plugins/docker-compose
    chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose

    echo "=== [3/5] Setting up Stride application directory ==="
    mkdir -p /opt/stride
    cd /opt/stride

    cat << 'COMPOSE_EOF' > /opt/stride/docker-compose.yml
    services:
      redis:
        image: redis:7-alpine
        container_name: stride-redis
        restart: unless-stopped
        ports:
          - "6379:6379"
        command: redis-server --appendonly yes
        healthcheck:
          test: ["CMD", "redis-cli", "ping"]
          interval: 5s
          timeout: 3s
          retries: 5
        networks:
          - stride-net

      server:
        image: ${var.server_image_url}
        container_name: stride-server
        restart: unless-stopped
        ports:
          - "5000:5000"
        environment:
          - NODE_ENV=production
          - PORT=5000
          - REDIS_URL=redis://redis:6379
          - ALLOWED_ORIGINS=http://${var.alb_dns_name},https://${var.alb_dns_name}
        healthcheck:
          test: ["CMD", "wget", "-qO-", "http://127.0.0.1:5000/healthz"]
          interval: 10s
          timeout: 5s
          retries: 5
        depends_on:
          redis:
            condition: service_healthy
        networks:
          - stride-net

      client:
        image: ${var.client_image_url}
        container_name: stride-client
        restart: unless-stopped
        ports:
          - "80:80"
        healthcheck:
          test: ["CMD", "wget", "-qO-", "http://127.0.0.1:80/healthz"]
          interval: 10s
          timeout: 5s
          retries: 3
        depends_on:
          server:
            condition: service_healthy
        networks:
          - stride-net

    networks:
      stride-net:
        driver: bridge
    COMPOSE_EOF

    echo "=== [4/5] Authenticating with Amazon ECR ==="
    if [ -n "${var.ecr_registry_url}" ]; then
      aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${var.ecr_registry_url} || true
    fi

    echo "=== [5/5] Creating Systemd Service for Stride Containers ==="
    cat << 'SERVICE_EOF' > /etc/systemd/system/stride.service
    [Unit]
    Description=Stride E-Commerce Container Stack
    Requires=docker.service
    After=docker.service

    [Service]
    Type=oneshot
    RemainAfterExit=yes
    WorkingDirectory=/opt/stride
    ExecStart=/usr/local/lib/docker/cli-plugins/docker-compose up -d --remove-orphans
    ExecStop=/usr/local/lib/docker/cli-plugins/docker-compose down
    TimeoutStartSec=0

    [Install]
    WantedBy=multi-user.target
    SERVICE_EOF

    systemctl daemon-reload
    systemctl enable stride.service
    systemctl start stride.service

    echo "=== Stride Initialization Complete ==="
  EOF
}

# Launch Template
resource "aws_launch_template" "main" {
  name_prefix   = "${var.project_name}-${var.environment}-lt-"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = var.instance_type

  iam_instance_profile {
    name = var.instance_profile_name
  }

  network_interfaces {
    associate_public_ip_address = false
    security_groups             = [var.security_group_id]
  }

  user_data = base64encode(local.user_data)

  monitoring {
    enabled = true
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required" # IMDSv2 enforced for security
    http_put_response_hop_limit = 1
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name        = "${var.project_name}-${var.environment}-asg-instance"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "main" {
  name_prefix         = "${var.project_name}-${var.environment}-asg-"
  vpc_zone_identifier = var.private_subnet_ids

  min_size         = var.min_size
  max_size         = var.max_size
  desired_capacity = var.desired_capacity

  health_check_type         = "ELB"
  health_check_grace_period = 300

  target_group_arns = [
    var.client_target_group_arn,
    var.server_target_group_arn
  ]

  launch_template {
    id      = aws_launch_template.main.id
    version = "$Latest"
  }

  # Zero-downtime rolling update strategy
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = var.min_healthy_percentage
      instance_warmup        = 180
    }
    triggers = ["tag"]
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-${var.environment}-asg"
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = var.environment
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [desired_capacity]
  }
}

# Dynamic Scaling Policy: Target Tracking CPU Utilization (60%)
resource "aws_autoscaling_policy" "cpu_target_tracking" {
  name                   = "${var.project_name}-${var.environment}-cpu-target-tracking"
  autoscaling_group_name = aws_autoscaling_group.main.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60.0
  }
}

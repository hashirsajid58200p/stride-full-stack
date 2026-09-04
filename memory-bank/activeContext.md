# Active Context: AWS Enterprise Cloud & DevOps Transformation

## Current Focus
- Completed Phase 1 (Local containerization, security hardening, multi-stage Dockerfiles, and full verification via docker-compose).
- Completed Phase 3 (Modular Terraform infrastructure for VPC, ALB, ASG, Security Groups, IAM, ECR, Route 53, and separate Staging & Production environments).
- Completed Phase 4 (Automated Zero-Downtime GitHub Actions CI/CD pipelines for PR checks, Staging continuous delivery, and Production gated rolling updates).
- Next Step: Awaiting user input on AWS account configurations (Account IDs, Domain, IAM/OIDC credentials) to apply Terraform infrastructure.

## Active Decisions & Architectural Highlights
- **Container Architecture**: Frontend served via Nginx dual-stack with reverse proxy to backend `/api/` and `/socket.io/` paths. Backend runs Node.js 22 with dumb-init and non-root `node` user for least privilege and graceful signal termination.
- **Network & Compute Topology**: AWS Multi-AZ architecture with public ALB subnets and private ASG subnets. Instances update/pull via NAT Gateway. No public IP assigned to EC2 instances. Systems Manager (SSM) enabled for keyless shell access.
- **Zero-Downtime Deployment**: EC2 Auto Scaling Instance Refresh with rolling updates (`min_healthy_percentage = 100` in production) coupled with ALB target group health check validation before terminating old instances.

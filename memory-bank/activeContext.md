# Active Context: AWS Enterprise Cloud & DevOps Transformation

## Current Focus & Live Status
- **LIVE Deployment (100% Free Tier)**:
  - Instance ID: `i-02f9e8689d4038b27`
  - Region: `eu-north-1` (Stockholm)
  - Public IPv4: `16.170.250.11`
  - Live Public URL: [http://16.170.250.11/](http://16.170.250.11/)
  - Cost: **$0.00 / month (100% AWS Free Tier Eligible)**
- **System Configuration**:
  - 3.0 GiB Swap memory configured on 20 GiB gp3 SSD to guarantee stability for Node.js + Redis + Nginx on `t3.micro`.
  - Docker & Docker Compose v2 active.
  - All 3 containers (`stride-redis`, `stride-server`, `stride-client`) healthy.
  - `systemd` auto-restart service enabled at `/etc/systemd/system/stride.service`.

## Multi-Account & Terraform Artifacts
- Terraform modular infrastructure code saved under `terraform/` (VPC, Security, ALB, ASG, IAM, ECR, Route 53) for enterprise scale when needed.
- CI/CD workflows authored under `.github/workflows/` (PR checks, staging deployment, production rolling release).

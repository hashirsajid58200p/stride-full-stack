# Active Context: Production Deployment & Architecture Blueprint

## Current Focus & Live Production Status
- **LIVE Production Deployment (100% Free - Vercel Edge)**:
  - Frontend & Serverless API: [https://stride-full-stack.vercel.app/](https://stride-full-stack.vercel.app/)
  - Database: PostgreSQL with Row-Level Security on Supabase
  - Media & Avatars: Cloudinary CDN (all assets verified 200 OK)
  - Cost: **$0.00 / month (Zero Billing Overhead)**
  - Health Verification:
    - `/api/healthz` -> 200 OK (Process Liveness)
    - `/api/health` -> 200 OK (Deep Database Connectivity)

## Automated CI/CD & Enterprise Cloud Architecture
- **Continuous Integration (`.github/workflows/ci.yml`)**:
  - Automated client build & linting, server syntax check, and client/server Docker container build validation (`push: false`) on every commit to `main` and `staging`.
  - Runs 100% free on GitHub runners with no external cloud secrets required, ensuring a green repository badge.
- **Enterprise AWS Modular IaC (`terraform/`)**:
  - Modular Terraform code for VPC (multi-AZ), Security Groups, ALB, Auto Scaling Groups (ASG) with CPU target tracking, ECR repositories, and IAM least-privilege roles.
- **On-Demand Zero-Downtime AWS ASG Refresh (`deploy-production.yml`, `deploy-staging.yml`)**:
  - Maintained as manual `workflow_dispatch` pipelines ready for enterprise AWS deployment whenever OIDC IAM role secrets are provisioned.

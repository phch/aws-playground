# Deployment Guide

This guide provides detailed instructions for deploying the S3 Storage Browser application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [AWS Infrastructure Setup](#aws-infrastructure-setup)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Post-Deployment Configuration](#post-deployment-configuration)
6. [Verification](#verification)

## Prerequisites

### Required Tools

- AWS CLI (v2.x)
- AWS CDK (v2.x) OR Terraform (v1.x)
- Docker (for containerized deployment)
- Node.js 18+
- Python 3.11+

### AWS Account Requirements

- AWS account with admin access
- AWS CLI configured with credentials
- Budget for AWS services (estimate: $50-200/month depending on usage)

### Required AWS Permissions

Your IAM user/role needs permissions for:
- Cognito (User Pools)
- S3 (Buckets, Objects)
- IAM (Roles, Policies, Users)
- STS (AssumeRole, GetFederationToken)
- Lambda (if using serverless)
- ECS/Fargate (if using containers)
- API Gateway
- CloudWatch
- CloudTrail

## AWS Infrastructure Setup

### Option 1: Using AWS CDK

```bash
cd infrastructure/cdk

# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap aws://ACCOUNT-ID/REGION

# Deploy all stacks
cdk deploy --all --context environment=dev

# Save outputs
cdk deploy --all --outputs-file outputs.json
```

### Option 2: Using Terraform

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Create workspace for environment
terraform workspace new dev

# Review plan
terraform plan -var="environment=dev"

# Apply configuration
terraform apply -var="environment=dev"

# Save outputs
terraform output -json > outputs.json
```

### Option 3: Manual Setup via AWS Console

#### 1. Create Cognito User Pool

```bash
# Using AWS CLI
aws cognito-idp create-user-pool \
  --pool-name s3-storage-users-dev \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 8,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": false
    }
  }' \
  --auto-verified-attributes email \
  --username-attributes email \
  --region us-east-1
```

#### 2. Create App Client

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_XXXXXXXXX \
  --client-name s3-storage-client-dev \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --no-generate-secret \
  --region us-east-1
```

#### 3. Create S3 Bucket

```bash
# Create bucket
aws s3 mb s3://s3-storage-dev-ACCOUNT-ID --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket s3-storage-dev-ACCOUNT-ID \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket s3-storage-dev-ACCOUNT-ID \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket s3-storage-dev-ACCOUNT-ID \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Configure CORS
aws s3api put-bucket-cors \
  --bucket s3-storage-dev-ACCOUNT-ID \
  --cors-configuration file://cors-config.json
```

**cors-config.json:**
```json
{
  "CORSRules": [{
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}
```

## Backend Deployment

### Option 1: Docker Container on ECS

```bash
cd backend

# Build Docker image
docker build -t s3-storage-backend:latest .

# Tag for ECR
docker tag s3-storage-backend:latest ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com/s3-storage-backend:latest

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com

# Push to ECR
docker push ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com/s3-storage-backend:latest
```

Create ECS Task Definition:
```json
{
  "family": "s3-storage-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [{
    "name": "backend",
    "image": "ACCOUNT-ID.dkr.ecr.us-east-1.amazonaws.com/s3-storage-backend:latest",
    "portMappings": [{
      "containerPort": 8000,
      "protocol": "tcp"
    }],
    "environment": [
      {"name": "AWS_REGION", "value": "us-east-1"},
      {"name": "COGNITO_USER_POOL_ID", "value": "us-east-1_XXXXXXXXX"},
      {"name": "COGNITO_CLIENT_ID", "value": "xxxxxxxxxxxxxxxxxxxxxxxxxx"},
      {"name": "S3_BUCKET_NAME", "value": "s3-storage-dev-ACCOUNT-ID"},
      {"name": "ENVIRONMENT", "value": "production"}
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/s3-storage-backend",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    }
  }]
}
```

### Option 2: AWS Lambda + API Gateway

Package backend:
```bash
cd backend
pip install -t package -r requirements.txt
cd package
zip -r ../deployment-package.zip .
cd ..
zip -g deployment-package.zip main.py app/ config/ utils/
```

Create Lambda function:
```bash
aws lambda create-function \
  --function-name s3-storage-backend \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT-ID:role/lambda-execution-role \
  --handler main.handler \
  --zip-file fileb://deployment-package.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables='{
    "AWS_REGION":"us-east-1",
    "COGNITO_USER_POOL_ID":"us-east-1_XXXXXXXXX",
    "COGNITO_CLIENT_ID":"xxxxxxxxxxxxxxxxxxxxxxxxxx",
    "S3_BUCKET_NAME":"s3-storage-dev-ACCOUNT-ID"
  }'
```

### Option 3: EC2 Instance

```bash
# SSH to EC2 instance
ssh -i your-key.pem ec2-user@your-instance-ip

# Install dependencies
sudo yum update -y
sudo yum install python3.11 git -y

# Clone repository
git clone <repo-url>
cd s3-storage-for-3p/backend

# Set up virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Set environment variables
export AWS_REGION=us-east-1
export COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
export COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
export S3_BUCKET_NAME=s3-storage-dev-ACCOUNT-ID

# Run with systemd
sudo cp deployment/backend.service /etc/systemd/system/
sudo systemctl enable backend.service
sudo systemctl start backend.service
```

## Frontend Deployment

### Option 1: S3 + CloudFront

```bash
cd frontend

# Install dependencies
npm install

# Create production build
VITE_API_URL=https://api.your-domain.com \
VITE_AWS_REGION=us-east-1 \
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX \
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx \
VITE_S3_BUCKET_NAME=s3-storage-dev-ACCOUNT-ID \
npm run build

# Deploy to S3
aws s3 sync dist/ s3://frontend-bucket-name/ --delete

# Create CloudFront invalidation
aws cloudfront create-invalidation \
  --distribution-id EXXXXXXXXXX \
  --paths "/*"
```

### Option 2: Docker Container

```bash
cd frontend

# Build Docker image
docker build -t s3-storage-frontend:latest .

# Run locally to test
docker run -p 3000:3000 s3-storage-frontend:latest
```

## Post-Deployment Configuration

### 1. Update CORS Configuration

Update S3 bucket CORS to include your production domain:

```json
{
  "CORSRules": [{
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-domain.com"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}
```

### 2. Update Backend CORS_ORIGINS

Update `backend/.env`:
```
CORS_ORIGINS=http://localhost:3000,https://your-domain.com
```

### 3. Configure DNS

If using custom domain:
```bash
# Create Route53 hosted zone
aws route53 create-hosted-zone --name your-domain.com

# Point domain to CloudFront distribution
```

### 4. SSL Certificate

```bash
# Request certificate in us-east-1 (for CloudFront)
aws acm request-certificate \
  --domain-name your-domain.com \
  --validation-method DNS \
  --region us-east-1
```

## Verification

### 1. Backend Health Check

```bash
curl https://api.your-domain.com/health
# Should return: {"status": "healthy"}
```

### 2. Frontend Accessibility

```bash
curl -I https://your-domain.com
# Should return: HTTP/2 200
```

### 3. Authentication Flow

1. Open browser to `https://your-domain.com`
2. Click "Sign Up"
3. Register with email
4. Verify email (check inbox)
5. Login with credentials
6. Should redirect to dashboard

### 4. S3 Operations

1. Navigate to S3 Browser tab
2. Click "Upload" and select a file
3. Verify file appears in list
4. Click "Download" and verify file downloads
5. Delete file and verify it's removed

### 5. Credentials Management

1. Navigate to Credentials tab
2. Click "Generate New" for temporary credentials
3. Verify credentials are displayed
4. Download credentials file
5. Verify file contains valid AWS credentials

## Monitoring

### CloudWatch Dashboards

Create dashboard for monitoring:
```bash
aws cloudwatch put-dashboard \
  --dashboard-name S3-Storage-Dashboard \
  --dashboard-body file://dashboard-config.json
```

### Alarms

Set up alarms for:
- High error rate (> 5%)
- High latency (> 1 second)
- Failed authentications (> 10/minute)
- Low disk space (< 10%)

### Logs

- **Backend Logs**: CloudWatch Logs `/aws/ecs/s3-storage-backend`
- **Frontend Logs**: CloudWatch Logs `/aws/cloudfront/s3-storage-frontend`
- **S3 Access Logs**: S3 bucket `s3-storage-logs-dev-ACCOUNT-ID`

## Backup and Disaster Recovery

### Database Backups (if using RDS)

```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier s3-storage-db \
  --db-snapshot-identifier s3-storage-db-snapshot-$(date +%Y%m%d)
```

### S3 Cross-Region Replication

```bash
# Enable versioning on destination bucket
aws s3api put-bucket-versioning \
  --bucket s3-storage-backup-ACCOUNT-ID \
  --versioning-configuration Status=Enabled \
  --region us-west-2

# Configure replication
aws s3api put-bucket-replication \
  --bucket s3-storage-dev-ACCOUNT-ID \
  --replication-configuration file://replication-config.json
```

## Rollback Procedure

If deployment fails:

```bash
# CDK
cdk deploy --rollback

# Terraform
terraform apply -var="environment=dev" -auto-approve -var="version=previous"

# ECS
aws ecs update-service \
  --cluster s3-storage-cluster \
  --service s3-storage-backend \
  --task-definition s3-storage-backend:PREVIOUS_REVISION
```

## Troubleshooting

### Common Issues

1. **CORS errors**: Check S3 CORS configuration and backend CORS_ORIGINS
2. **Authentication fails**: Verify Cognito User Pool ID and Client ID
3. **S3 access denied**: Check IAM policies and bucket policies
4. **High latency**: Enable CloudFront, check database indices
5. **Memory issues**: Increase ECS task memory or Lambda memory

### Debug Mode

Enable debug logging:
```bash
# Backend
export LOG_LEVEL=DEBUG

# Check logs
aws logs tail /ecs/s3-storage-backend --follow
```

## Cost Optimization

- Use S3 Lifecycle policies to move old versions to Glacier
- Enable S3 Intelligent-Tiering
- Use CloudFront caching effectively
- Set up Auto Scaling for ECS tasks
- Use Reserved Instances for predictable workloads

## Security Best Practices

- [ ] Enable AWS WAF on API Gateway/CloudFront
- [ ] Enable GuardDuty for threat detection
- [ ] Enable Security Hub for compliance
- [ ] Rotate credentials regularly
- [ ] Use Secrets Manager for sensitive data
- [ ] Enable MFA for Cognito users
- [ ] Review IAM policies quarterly
- [ ] Enable CloudTrail for all regions
- [ ] Set up SNS alerts for security events

## Support

For issues:
- Check CloudWatch Logs
- Review CloudTrail events
- Open GitHub issue
- Contact support team

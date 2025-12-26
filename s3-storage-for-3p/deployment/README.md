# Deployment Guide

This directory contains deployment configurations, scripts, and examples for deploying the S3 Storage Browser application across different environments.

## Directory Structure

```
deployment/
├── dev/              # Development environment config
├── staging/          # Staging environment config
├── prod/             # Production environment config
├── scripts/          # Deployment automation scripts
├── ci-cd-examples/   # CI/CD pipeline templates
└── README.md         # This file
```

## Quick Start

### Local Development Deployment

```bash
# Run the local deployment script
./deployment/scripts/deploy-local.sh
```

This will:
1. Check for Docker and docker-compose
2. Create .env files from examples if they don't exist
3. Build and start all services
4. Display access URLs

### Infrastructure Deployment

#### Using Terraform

```bash
# Plan infrastructure changes
./deployment/scripts/deploy-infrastructure.sh -e dev -a plan

# Apply infrastructure changes
./deployment/scripts/deploy-infrastructure.sh -e dev -a apply

# With auto-approval
./deployment/scripts/deploy-infrastructure.sh -e prod -a apply -y

# Destroy infrastructure
./deployment/scripts/deploy-infrastructure.sh -e dev -a destroy
```

#### Using AWS CDK

```bash
# View changes
./deployment/scripts/deploy-cdk.sh -e dev -a diff

# Deploy infrastructure
./deployment/scripts/deploy-cdk.sh -e staging -a deploy

# Destroy infrastructure
./deployment/scripts/deploy-cdk.sh -e dev -a destroy
```

## Environment Configuration

### Development (dev/)

Development environment configuration:
- Debug logging enabled
- CORS allows localhost origins
- Relaxed rate limiting
- Shorter token expiration for testing

**Setup:**
1. Copy `.env.example` to `.env`
2. Configure with development AWS resources
3. Use minimal security for faster iteration

### Staging (staging/)

Pre-production environment:
- INFO level logging
- Moderate rate limiting
- Production-like configuration
- Used for final testing

**Setup:**
1. Copy `.env.example` to `.env`
2. Configure with staging AWS resources
3. Mirror production settings

### Production (prod/)

Production environment:
- WARNING level logging
- Strict rate limiting
- Secure credential management
- Optimized for performance

**Setup:**
1. Copy `.env.example` to `.env`
2. Use AWS Secrets Manager for sensitive values
3. Enable all security features
4. Configure monitoring and alerting

## CI/CD Pipeline Examples

### GitHub Actions

See `ci-cd-examples/github-actions.yml` for a complete CI/CD pipeline that:
- Runs tests on every push
- Builds Docker images
- Deploys to staging on develop branch
- Deploys to production on main branch (manual approval)

**Setup:**
1. Copy to `.github/workflows/ci-cd.yml`
2. Configure GitHub Secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `SLACK_WEBHOOK` (optional)

### GitLab CI

See `ci-cd-examples/gitlab-ci.yml` for a GitLab pipeline with:
- Parallel test execution
- Docker image building
- Environment-based deployments
- Manual approval for production

**Setup:**
1. Copy to `.gitlab-ci.yml`
2. Configure GitLab CI/CD Variables
3. Set up deployment environments

## Deployment Strategies

### Blue-Green Deployment

1. Deploy new version alongside existing (green)
2. Run smoke tests on new deployment
3. Switch traffic to new version
4. Keep old version for quick rollback

```bash
# Deploy green environment
aws ecs create-service \
  --cluster s3-storage-prod \
  --service-name backend-green \
  --task-definition backend:latest

# Update load balancer to point to green
aws elbv2 modify-rule \
  --rule-arn $RULE_ARN \
  --actions Type=forward,TargetGroupArn=$GREEN_TG_ARN

# After validation, decommission blue
aws ecs delete-service \
  --cluster s3-storage-prod \
  --service backend-blue
```

### Canary Deployment

1. Deploy new version to small subset of users
2. Monitor metrics and errors
3. Gradually increase traffic if successful
4. Rollback if issues detected

```bash
# Deploy canary with 10% traffic
aws ecs update-service \
  --cluster s3-storage-prod \
  --service backend-canary \
  --desired-count 1

# Gradually increase
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --default-actions ... # Adjust weights
```

## Infrastructure as Code

### Terraform Structure

```
infrastructure/terraform/
├── main.tf           # Main infrastructure definition
├── variables.tf      # Input variables
├── outputs.tf        # Output values
├── backend.tf        # State backend config
└── terraform.tfvars  # Variable values
```

**Key Resources:**
- Cognito User Pool and Client
- S3 Buckets (main + logs)
- IAM Roles and Policies
- CloudWatch Log Groups
- Optional: API Gateway, Lambda functions

### CDK Structure

```
infrastructure/cdk/
├── bin/
│   └── app.ts        # CDK app entry point
├── lib/
│   ├── cognito-stack.ts   # Cognito resources
│   ├── s3-stack.ts        # S3 resources
│   └── api-stack.ts       # API Gateway & compute
└── cdk.json          # CDK configuration
```

**Stacks:**
1. **CognitoStack**: User authentication
2. **S3Stack**: Storage buckets
3. **ApiStack**: API Gateway, Lambda/ECS

## Monitoring and Alerting

### CloudWatch Metrics

Key metrics to monitor:
- API Gateway 4xx/5xx errors
- Lambda/ECS invocation errors
- S3 request metrics
- Cognito authentication failures

### Alarms

Set up CloudWatch Alarms for:
```bash
# High error rate
aws cloudwatch put-metric-alarm \
  --alarm-name high-error-rate \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --metric-name 5XXError \
  --namespace AWS/ApiGateway \
  --period 300 \
  --statistic Sum \
  --threshold 10
```

### X-Ray Tracing

Enable distributed tracing:
```python
# In backend main.py
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.ext.flask.middleware import XRayMiddleware

xray_recorder.configure(service='s3-storage-backend')
XRayMiddleware(app, xray_recorder)
```

## Backup and Recovery

### Database Backups

If using RDS for session storage:
```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier s3-storage-db \
  --db-snapshot-identifier backup-$(date +%Y%m%d)

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier s3-storage-db-restored \
  --db-snapshot-identifier backup-20240101
```

### S3 Versioning

S3 versioning is enabled by default. To recover deleted objects:
```bash
# List versions
aws s3api list-object-versions \
  --bucket $BUCKET_NAME \
  --prefix users/$USER_ID/

# Restore specific version
aws s3api copy-object \
  --bucket $BUCKET_NAME \
  --copy-source $BUCKET_NAME/path/to/file?versionId=$VERSION_ID \
  --key path/to/file
```

## Security Checklist

Before deploying to production:

- [ ] Secrets stored in AWS Secrets Manager/Parameter Store
- [ ] HTTPS enforced (no HTTP)
- [ ] CORS restricted to known domains
- [ ] Rate limiting configured
- [ ] CloudTrail enabled for audit logs
- [ ] S3 bucket policies restrict access
- [ ] IAM roles follow least privilege
- [ ] MFA enabled for critical operations
- [ ] Security groups allow minimal ports
- [ ] WAF configured (if using API Gateway)
- [ ] CloudWatch alarms set up
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented

## Troubleshooting

### Common Issues

**Issue: Services won't start**
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Restart services
docker-compose restart
```

**Issue: AWS credentials not working**
```bash
# Verify credentials
aws sts get-caller-identity

# Check environment variables
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
```

**Issue: Terraform state locked**
```bash
# Force unlock (use with caution)
terraform force-unlock <lock-id>
```

**Issue: CDK deployment fails**
```bash
# Clear CDK cache
rm -rf cdk.out/

# Re-synthesize
cdk synth

# Try deploy again
cdk deploy --all
```

## Performance Optimization

### Frontend

- Enable CloudFront CDN
- Implement code splitting
- Use lazy loading for routes
- Optimize images and assets
- Enable gzip/brotli compression

### Backend

- Use connection pooling for boto3
- Implement caching (Redis/ElastiCache)
- Enable API Gateway caching
- Use Lambda provisioned concurrency
- Optimize database queries

### S3

- Use S3 Transfer Acceleration
- Implement multipart upload for large files
- Use appropriate storage classes
- Enable S3 Intelligent-Tiering

## Cost Optimization

### Tips

1. Use S3 Lifecycle policies for old versions
2. Enable S3 Intelligent-Tiering
3. Right-size ECS tasks/Lambda memory
4. Use Spot instances for non-critical workloads
5. Set up AWS Budgets and Cost Anomaly Detection
6. Review CloudWatch log retention periods
7. Delete unused resources in non-prod environments

## Support and Resources

- **Documentation**: See main README.md
- **Infrastructure Code**: See infrastructure/ directory
- **API Documentation**: http://localhost:8000/api/docs (dev)
- **AWS Documentation**: https://docs.aws.amazon.com/

## Contributing

When adding deployment configurations:
1. Test thoroughly in dev environment
2. Document any new environment variables
3. Update this README
4. Follow the existing naming conventions
5. Add appropriate security controls

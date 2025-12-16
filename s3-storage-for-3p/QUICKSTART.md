# Quick Start Guide

Get the S3 Storage Browser up and running in 5 minutes!

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Docker and docker-compose (for local development)
- AWS Account with CLI configured
- Git

## Option 1: Local Development (Fastest)

### 1. Run Setup Script

```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Install backend dependencies
- Install frontend dependencies
- Create .env files from examples

### 2. Configure Environment

Edit the generated .env files:

**Backend (.env):**
```bash
cd backend
vi .env
```

Required settings:
```env
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=your-pool-id
COGNITO_CLIENT_ID=your-client-id
S3_BUCKET_NAME=your-bucket-name
JWT_SECRET_KEY=your-secret-key
```

**Frontend (.env):**
```bash
cd frontend
vi .env
```

Required settings:
```env
VITE_API_URL=http://localhost:8000
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=your-pool-id
VITE_COGNITO_CLIENT_ID=your-client-id
```

### 3. Start with Docker Compose

```bash
./deployment/scripts/deploy-local.sh
```

**OR** start manually:

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
python main.py

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### 4. Access Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/api/docs

### 5. Test It Out

1. Register a new user
2. Verify email with code
3. Login
4. Generate temporary credentials (Tab 1)
5. Upload a file (Tab 2)

## Option 2: Deploy to AWS

### 1. Deploy Infrastructure

**Using Terraform:**
```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your settings

# Deploy
./deployment/scripts/deploy-infrastructure.sh -e dev -a plan
./deployment/scripts/deploy-infrastructure.sh -e dev -a apply -y
```

**Using AWS CDK:**
```bash
cd infrastructure/cdk
npm install

# Deploy
./deployment/scripts/deploy-cdk.sh -e dev -a deploy
```

### 2. Get Output Values

After infrastructure deployment, note these values:

```bash
# Terraform
terraform output

# CDK
aws cloudformation describe-stacks \
  --stack-name S3Storage-Cognito-dev \
  --query 'Stacks[0].Outputs' --output table
```

### 3. Update Environment Files

Use the output values to update your .env files.

### 4. Deploy Application

**Backend:**
```bash
cd backend
docker build -t s3-storage-backend .
# Push to ECR and deploy to ECS/Lambda
```

**Frontend:**
```bash
cd frontend
npm run build
# Deploy to S3 + CloudFront or ECS
```

## Common Commands

### Backend

```bash
# Run tests
cd backend && pytest

# Run with auto-reload
python main.py

# Format code
black backend/

# Check code quality
flake8 backend/
```

### Frontend

```bash
# Development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Infrastructure

```bash
# Terraform
terraform plan
terraform apply
terraform destroy

# CDK
cdk diff
cdk deploy
cdk destroy
```

### Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild images
docker-compose build
```

## Troubleshooting

### Backend won't start

```bash
# Check Python version
python --version  # Should be 3.11+

# Recreate virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend build errors

```bash
# Clear node modules
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 18+
```

### AWS Connection Issues

```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check AWS region
echo $AWS_DEFAULT_REGION

# Test Cognito connection
aws cognito-idp list-user-pools --max-results 10
```

### Docker issues

```bash
# Restart Docker daemon
sudo systemctl restart docker

# Clean up Docker
docker system prune -a

# Check Docker status
docker info
```

## What's Next?

1. **Read the Documentation**
   - [README.md](README.md) - Full documentation
   - [API.md](API.md) - API reference
   - [SECURITY.md](SECURITY.md) - Security guidelines
   - [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment guide

2. **Explore the Features**
   - User authentication and password management
   - Generate temporary AWS credentials
   - Browse and manage S3 objects
   - Upload and download files
   - View object versions

3. **Customize for Your Needs**
   - Modify UI components in `frontend/src/components/`
   - Adjust API endpoints in `backend/app/`
   - Update infrastructure in `infrastructure/`

4. **Deploy to Production**
   - Follow security checklist in SECURITY.md
   - Set up CI/CD pipeline from examples
   - Configure monitoring and alerting
   - Enable CloudTrail and GuardDuty

## Need Help?

- **Documentation:** Check README.md
- **API Reference:** See API.md
- **Security:** Review SECURITY.md
- **Contributing:** Read CONTRIBUTING.md
- **Issues:** Check existing GitHub issues

## Pro Tips

1. **Use AWS Secrets Manager** for production secrets instead of .env files
2. **Enable MFA** on your Cognito user pool for production
3. **Set up CloudWatch alarms** for monitoring
4. **Use separate AWS accounts** for dev/staging/prod
5. **Implement proper backup strategy** for S3 and Cognito
6. **Regular security audits** and dependency updates
7. **Monitor costs** with AWS Cost Explorer and Budgets

Happy coding! 🚀

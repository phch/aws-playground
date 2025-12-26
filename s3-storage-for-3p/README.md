# S3 Storage Browser for Third-Party Users

A complete, production-ready web application for managing S3 storage with user-scoped access control, AWS Cognito authentication, and comprehensive credential management.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Development Phases](#development-phases)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## Overview

This application provides a secure, user-friendly interface for third-party users to interact with AWS S3 storage. Each user is automatically scoped to their own prefix (`/users/{cognito-user-id}/`), ensuring complete data isolation between users.

### Key Capabilities

- **User Authentication**: AWS Cognito integration with email/username login
- **Credential Management**: Generate temporary STS tokens and manage IAM access keys
- **S3 Object Management**: Upload, download, delete, and browse S3 objects
- **Object Versioning**: Support for S3 versioning with version history
- **Multipart Upload**: Handle large files efficiently with multipart upload
- **Pre-signed URLs**: Secure direct download links with expiration
- **Audit Logging**: Comprehensive logging for compliance and security

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   React SPA     │────────>│   API Gateway    │
│  (TypeScript)   │         │   (REST API)     │
└─────────────────┘         └──────────────────┘
                                      │
                            ┌─────────┴─────────┐
                            │                   │
                    ┌───────▼────────┐  ┌──────▼──────┐
                    │  FastAPI App   │  │  Cognito    │
                    │   (Python)     │  │ User Pool   │
                    └───────┬────────┘  └─────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
        ┌───────▼─────┐ ┌──▼───┐ ┌────▼─────┐
        │  S3 Bucket  │ │ IAM  │ │   STS    │
        │ (Versioned) │ │      │ │          │
        └─────────────┘ └──────┘ └──────────┘
```

### Security Model

- **Authentication**: JWT tokens validated against AWS Cognito
- **Authorization**: Role-based access control with S3 prefix scoping
- **Data Isolation**: Each user can only access `s3://bucket/users/{user-id}/*`
- **Temporary Credentials**: Time-limited STS tokens with minimal permissions
- **Encryption**: S3 server-side encryption (AES-256 or KMS)
- **HTTPS**: All communication encrypted in transit

## Features

### Authentication & User Management
- Email/username registration with email verification
- Password reset and change functionality
- JWT-based session management with token refresh
- Optional multi-factor authentication (MFA)
- User profile management

### Credential Management (Tab 1)
- **Temporary STS Credentials**
  - Generate time-limited credentials (15 min - 12 hours)
  - Automatic prefix scoping to user's S3 path
  - Download credentials in AWS CLI or ENV format
  - Secure credential display with show/hide toggle
- **IAM Access Keys**
  - Create permanent access keys for programmatic access
  - List and manage all access keys
  - Activate/deactivate keys
  - Rotate keys securely
  - Delete keys when no longer needed

### S3 Object Management (Tab 2)
- **Browse & Navigate**
  - Folder-based navigation with breadcrumbs
  - List objects with pagination
  - Search and filter objects
  - View object metadata and versions
- **Upload**
  - Single file upload
  - Batch upload with drag-and-drop
  - Progress tracking per file
  - Multipart upload for large files (>5MB)
- **Download**
  - Pre-signed URLs for secure download
  - Direct download from browser
  - Support for object versions
- **Delete**
  - Single object deletion
  - Bulk deletion with selection
  - Confirmation prompts
- **Folders**
  - Create nested folder structure
  - Navigate folder hierarchy
  - Delete folders and contents

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Material-UI** for component library
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Axios** for HTTP requests
- **Vite** for build tooling

### Backend
- **FastAPI** (Python 3.11+)
- **boto3** for AWS SDK
- **python-jose** for JWT handling
- **pydantic** for data validation
- **slowapi** for rate limiting
- **uvicorn** as ASGI server

### AWS Services
- **Amazon Cognito** - User authentication
- **Amazon S3** - Object storage
- **AWS STS** - Temporary credentials
- **AWS IAM** - Access management
- **Amazon CloudWatch** - Logging and monitoring
- **AWS X-Ray** - Distributed tracing
- **AWS CloudTrail** - API audit logging

### Infrastructure
- **AWS CDK** or **Terraform** for IaC
- **Docker** for containerization
- **GitHub Actions** for CI/CD

## Project Structure

```
s3-storage-for-3p/
├── frontend/                    # React TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/           # Authentication components
│   │   │   ├── CredentialManager/  # Credential management UI
│   │   │   ├── S3Browser/      # S3 object management UI
│   │   │   └── Common/         # Shared components
│   │   ├── pages/              # Page components
│   │   ├── store/              # Redux store and slices
│   │   ├── services/           # API service layer
│   │   ├── types/              # TypeScript type definitions
│   │   ├── utils/              # Utility functions
│   │   ├── App.tsx             # Main App component
│   │   └── main.tsx            # Application entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                     # FastAPI Python backend
│   ├── app/
│   │   ├── auth/               # Authentication module
│   │   │   ├── service.py      # Cognito service
│   │   │   └── router.py       # Auth endpoints
│   │   ├── s3/                 # S3 operations module
│   │   │   ├── service.py      # S3 service
│   │   │   └── router.py       # S3 endpoints
│   │   ├── credentials/        # Credential management module
│   │   │   ├── service.py      # Credential service
│   │   │   └── router.py       # Credential endpoints
│   │   └── models/             # Pydantic models
│   │       └── schemas.py
│   ├── config/                 # Configuration
│   │   └── settings.py
│   ├── utils/                  # Utilities
│   │   ├── security.py         # Security functions
│   │   └── logging.py          # Logging setup
│   ├── tests/                  # Unit and integration tests
│   ├── main.py                 # FastAPI application
│   └── requirements.txt
│
├── infrastructure/              # Infrastructure as Code
│   ├── cdk/                    # AWS CDK (TypeScript)
│   │   ├── lib/
│   │   │   ├── cognito-stack.ts
│   │   │   ├── s3-stack.ts
│   │   │   ├── api-stack.ts
│   │   │   └── pipeline-stack.ts
│   │   ├── bin/
│   │   ├── package.json
│   │   └── cdk.json
│   └── terraform/              # Terraform (HCL)
│       ├── modules/
│       │   ├── cognito/
│       │   ├── s3/
│       │   └── api-gateway/
│       ├── environments/
│       │   ├── dev/
│       │   ├── staging/
│       │   └── prod/
│       └── main.tf
│
├── deployment/                  # Deployment configurations
│   ├── dev/
│   │   └── values.yaml
│   ├── staging/
│   │   └── values.yaml
│   └── prod/
│       └── values.yaml
│
├── .github/
│   └── workflows/              # CI/CD pipelines
│       ├── frontend.yml
│       ├── backend.yml
│       └── infrastructure.yml
│
└── README.md
```

## Prerequisites

### Development Environment
- Node.js 18+ and npm/yarn
- Python 3.11+
- AWS CLI configured with appropriate credentials
- AWS account with permissions to create:
  - Cognito User Pools
  - S3 Buckets
  - IAM Roles and Policies
  - API Gateway (optional)
  - Lambda Functions (optional)

### AWS Services Setup
- AWS account with admin access (for initial setup)
- AWS region selected (e.g., us-east-1)
- Domain name (optional, for custom domain)

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd s3-storage-for-3p
```

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### 3. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
python main.py
```

## Configuration

### Frontend Environment Variables

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_S3_BUCKET_NAME=your-s3-bucket-name
```

### Backend Environment Variables

Create `backend/.env`:

```env
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
S3_BUCKET_NAME=your-s3-bucket-name
JWT_SECRET_KEY=your-secret-key-here-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
CORS_ORIGINS=http://localhost:3000,https://your-domain.com
ENVIRONMENT=development
LOG_LEVEL=INFO
```

### AWS Infrastructure Configuration

#### 1. Create Cognito User Pool

```bash
aws cognito-idp create-user-pool \
  --pool-name s3-storage-users \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}" \
  --auto-verified-attributes email \
  --username-attributes email \
  --region us-east-1
```

#### 2. Create Cognito App Client

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_XXXXXXXXX \
  --client-name s3-storage-client \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region us-east-1
```

#### 3. Create S3 Bucket

```bash
aws s3 mb s3://your-s3-bucket-name --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket your-s3-bucket-name \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket your-s3-bucket-name \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

#### 4. Configure CORS for S3

```bash
aws s3api put-bucket-cors \
  --bucket your-s3-bucket-name \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedOrigins": ["http://localhost:3000"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }]
  }'
```

## Deployment

### Development

```bash
# Frontend
cd frontend
npm run dev

# Backend
cd backend
python main.py
```

### Production

#### Using Docker

```bash
# Build frontend
cd frontend
docker build -t s3-storage-frontend .

# Build backend
cd backend
docker build -t s3-storage-backend .

# Run with docker-compose
docker-compose up -d
```

#### Using AWS

1. **Deploy with CDK**:
```bash
cd infrastructure/cdk
npm install
cdk bootstrap
cdk deploy --all
```

2. **Deploy with Terraform**:
```bash
cd infrastructure/terraform/environments/prod
terraform init
terraform plan
terraform apply
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "message": "User registered successfully. Please check your email for verification code."
}
```

#### POST /api/auth/login
Authenticate and receive tokens.

**Request:**
```json
{
  "username": "john_doe",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "id_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### S3 Endpoints

#### GET /api/s3/objects
List objects in user's prefix.

**Query Parameters:**
- `prefix` (optional): Folder prefix
- `continuation_token` (optional): For pagination
- `max_keys` (optional): Maximum objects to return

**Response:**
```json
{
  "objects": [
    {
      "key": "users/abc-123/file.txt",
      "size": 1024,
      "last_modified": "2024-01-01T10:00:00Z",
      "etag": "abc123",
      "storage_class": "STANDARD",
      "is_folder": false
    }
  ],
  "prefix": "users/abc-123/",
  "has_more": false
}
```

#### POST /api/s3/upload
Upload a file.

**Request:** multipart/form-data
- `file`: File to upload
- `key`: S3 key for the object

**Response:**
```json
{
  "key": "users/abc-123/file.txt",
  "etag": "abc123",
  "message": "File uploaded successfully"
}
```

### Credential Endpoints

#### POST /api/credentials/temporary
Generate temporary STS credentials.

**Request:**
```json
{
  "duration_seconds": 3600
}
```

**Response:**
```json
{
  "access_key_id": "ASIA...",
  "secret_access_key": "...",
  "session_token": "...",
  "expiration": "2024-01-01T11:00:00Z"
}
```

#### POST /api/credentials/access-key
Create IAM access key.

**Response:**
```json
{
  "access_key_id": "AKIA...",
  "secret_access_key": "...",
  "create_date": "2024-01-01T10:00:00Z",
  "status": "Active"
}
```

## Security

### Best Practices

1. **Environment Variables**: Never commit `.env` files. Use AWS Secrets Manager in production.

2. **HTTPS Only**: Enforce HTTPS in production with valid SSL certificates.

3. **Token Management**:
   - Store tokens securely (HttpOnly cookies recommended)
   - Implement token refresh before expiration
   - Clear tokens on logout

4. **Input Validation**:
   - All inputs are validated on both frontend and backend
   - SQL injection prevention through parameterized queries
   - XSS prevention through proper output encoding

5. **Rate Limiting**:
   - API endpoints are rate-limited (60 requests/minute per IP)
   - Adjust limits based on your needs

6. **Audit Logging**:
   - All operations are logged with user ID and timestamp
   - Logs sent to CloudWatch for monitoring
   - Set up alerts for suspicious activities

7. **S3 Bucket Security**:
   - Block public access
   - Enable versioning
   - Enable logging
   - Use encryption at rest

8. **IAM Policies**:
   - Follow principle of least privilege
   - Use condition keys for S3 prefix scoping
   - Regularly audit permissions

### Security Headers

The application implements:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- CORS policy with specific origins

## Development Phases

### Phase 1: Core Authentication (Week 1)
- [x] Set up AWS Cognito User Pool
- [x] Implement user registration and login
- [x] Email verification flow
- [x] Password reset functionality
- [x] JWT token management
- [x] Protected routes in frontend

### Phase 2: S3 Integration (Week 2)
- [x] S3 bucket setup with versioning
- [x] User prefix assignment
- [x] List objects with pagination
- [x] Single file upload
- [x] File download with pre-signed URLs
- [x] Object deletion

### Phase 3: Credential Management (Week 3)
- [x] STS temporary credential generation
- [x] IAM access key creation
- [x] Credential display UI
- [x] Credential download in multiple formats
- [x] Key rotation functionality

### Phase 4: Advanced Features (Week 4)
- [x] Batch file upload
- [x] Drag-and-drop interface
- [x] Object search and filtering
- [x] Folder creation and navigation
- [x] Object versioning UI
- [x] Multipart upload for large files

### Phase 5: Production Readiness (Week 5)
- [ ] Comprehensive error handling
- [ ] Performance optimization
- [ ] Security audit
- [ ] Load testing
- [ ] Documentation completion
- [ ] Deployment automation

## Performance Optimization

### Frontend
1. **Code Splitting**: Use React.lazy for route-based code splitting
2. **Memoization**: Use React.memo and useMemo for expensive computations
3. **Virtual Scrolling**: Implement virtual scrolling for large object lists
4. **Image Optimization**: Compress and lazy-load images
5. **Bundle Size**: Analyze and minimize bundle size

### Backend
1. **Connection Pooling**: Reuse boto3 clients
2. **Caching**: Implement Redis for frequently accessed data
3. **Async Operations**: Use async/await for I/O operations
4. **Pagination**: Always paginate large result sets
5. **Compression**: Enable gzip compression for responses

### S3
1. **Transfer Acceleration**: Enable S3 Transfer Acceleration for faster uploads
2. **CloudFront**: Use CloudFront CDN for faster downloads
3. **Multipart Upload**: Use for files larger than 5MB
4. **Lifecycle Policies**: Archive old versions to Glacier

## Troubleshooting

### Common Issues

#### 1. CORS Errors
**Problem**: Browser blocks requests due to CORS policy

**Solution**:
- Verify CORS origins in backend `.env`
- Check S3 bucket CORS configuration
- Ensure API Gateway CORS is properly configured

#### 2. Authentication Fails
**Problem**: User cannot log in

**Solution**:
- Verify Cognito User Pool ID and Client ID
- Check user is confirmed (email verified)
- Ensure password meets requirements
- Check JWT secret key matches

#### 3. S3 Access Denied
**Problem**: Cannot upload/download files

**Solution**:
- Verify S3 bucket name is correct
- Check IAM policies allow required actions
- Ensure user prefix is correctly set
- Review CloudWatch logs for detailed errors

#### 4. Token Expired
**Problem**: Token expires during session

**Solution**:
- Implement automatic token refresh
- Check JWT expiration time settings
- Verify refresh token is being stored

### Debugging

Enable debug logging:

```bash
# Backend
export LOG_LEVEL=DEBUG
python main.py

# Frontend
VITE_DEBUG=true npm run dev
```

Check logs:
- **Backend**: Console output or CloudWatch
- **Frontend**: Browser console
- **AWS**: CloudWatch Logs, CloudTrail

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Specify your license here]

## Support

For issues and questions:
- Open an issue on GitHub
- Contact: [your-email@example.com]

## Acknowledgments

- AWS SDK for Python (boto3)
- FastAPI framework
- React and Material-UI communities

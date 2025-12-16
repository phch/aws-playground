# Security Best Practices

This document outlines security considerations, best practices, and implementation details for the S3 Storage Browser application.

## Table of Contents

- [Security Model](#security-model)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Data Protection](#data-protection)
- [Network Security](#network-security)
- [Audit and Compliance](#audit-and-compliance)
- [Incident Response](#incident-response)
- [Security Checklist](#security-checklist)

## Security Model

### Defense in Depth

The application implements multiple layers of security:

1. **Network Layer**: VPC, Security Groups, NACLs
2. **Application Layer**: JWT validation, input sanitization, rate limiting
3. **Data Layer**: Encryption at rest and in transit, prefix-based isolation
4. **Identity Layer**: AWS Cognito, MFA, password policies
5. **Audit Layer**: CloudWatch Logs, CloudTrail, custom audit logging

### Zero Trust Architecture

- Never trust, always verify
- Least privilege access by default
- Continuous validation of user identity
- Micro-segmentation with S3 prefix isolation

## Authentication

### AWS Cognito Configuration

**User Pool Settings:**
```json
{
  "passwordPolicy": {
    "minimumLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSymbols": false
  },
  "mfaConfiguration": "OPTIONAL",
  "emailVerificationRequired": true
}
```

**Client Settings:**
- OAuth flows: User Password Auth, Refresh Token Auth
- No client secret (public client)
- Prevent user existence errors enabled
- Token validity: Access (1h), ID (1h), Refresh (30d)

### JWT Token Security

**Token Validation:**
```python
from jose import jwt, JWTError

def verify_token(token: str) -> Dict[str, Any]:
    """Verify and decode JWT token with proper validation."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": True,
                "verify_iat": True,
                "verify_aud": False  # Adjust based on your needs
            }
        )
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail="Invalid token")
```

**Token Storage (Frontend):**
- Store in memory (not localStorage) for sensitive apps
- Use httpOnly cookies for additional security
- Implement token refresh before expiration
- Clear tokens on logout

### Multi-Factor Authentication

Enable MFA for production:
```python
# In Cognito configuration
user_pool.add_custom_attribute('phone_number_verified', {
    'mutable': True,
})

# Enable SMS MFA
response = cognito_client.set_user_mfa_preference(
    AccessToken=access_token,
    SMSMfaSettings={
        'Enabled': True,
        'PreferredMfa': True
    }
)
```

## Authorization

### S3 Prefix Scoping

**Automatic User Prefix Assignment:**
```python
def get_user_s3_prefix(user_id: str) -> str:
    """Generate S3 prefix based on Cognito user ID."""
    # Uses Cognito sub (UUID) which is immutable
    return f"users/{user_id}/"
```

**Access Validation:**
```python
def validate_s3_key_access(user_id: str, key: str) -> bool:
    """Validate that user can only access their prefix."""
    user_prefix = get_user_s3_prefix(user_id)
    
    if not key.startswith(user_prefix):
        logger.warning(
            f"Unauthorized access attempt",
            extra={
                "user_id": user_id,
                "attempted_key": key,
                "allowed_prefix": user_prefix
            }
        )
        return False
    
    return True
```

### IAM Policy Template

**STS Temporary Credentials Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObjectVersion"
      ],
      "Resource": "arn:aws:s3:::bucket-name/users/${cognito:sub}/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:ListBucketVersions"
      ],
      "Resource": "arn:aws:s3:::bucket-name",
      "Condition": {
        "StringLike": {
          "s3:prefix": "users/${cognito:sub}/*"
        }
      }
    }
  ]
}
```

### Role-Based Access Control (RBAC)

Implement role-based permissions:
```python
from enum import Enum

class UserRole(str, Enum):
    VIEWER = "viewer"      # Read-only access
    EDITOR = "editor"      # Read and write
    ADMIN = "admin"        # Full access + management

def check_permission(user: User, action: str, resource: str) -> bool:
    """Check if user has permission for action on resource."""
    permissions = {
        UserRole.VIEWER: ["read"],
        UserRole.EDITOR: ["read", "write", "delete"],
        UserRole.ADMIN: ["read", "write", "delete", "manage"]
    }
    
    return action in permissions.get(user.role, [])
```

## Data Protection

### Encryption at Rest

**S3 Bucket Encryption:**
```python
# Using AES-256 (default)
bucket = s3.Bucket(
    "StorageBucket",
    encryption=s3.BucketEncryption.S3_MANAGED
)

# Using KMS (recommended for compliance)
bucket = s3.Bucket(
    "StorageBucket",
    encryption=s3.BucketEncryption.KMS_MANAGED,
    encryption_key=kms_key
)
```

**Client-Side Encryption (Optional):**
```python
from cryptography.fernet import Fernet

def encrypt_file(file_content: bytes, key: bytes) -> bytes:
    """Encrypt file content before upload."""
    f = Fernet(key)
    return f.encrypt(file_content)

def decrypt_file(encrypted_content: bytes, key: bytes) -> bytes:
    """Decrypt file after download."""
    f = Fernet(key)
    return f.decrypt(encrypted_content)
```

### Encryption in Transit

**HTTPS Enforcement:**
```python
# In main.py middleware
@app.middleware("http")
async def enforce_https(request: Request, call_next):
    if not request.url.scheme == "https" and settings.environment == "production":
        return JSONResponse(
            status_code=403,
            content={"detail": "HTTPS required"}
        )
    return await call_next(request)
```

**S3 Bucket Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::bucket-name/*",
        "arn:aws:s3:::bucket-name"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

### Sensitive Data Handling

**Secrets Management:**
```python
import boto3
from botocore.exceptions import ClientError

def get_secret(secret_name: str) -> str:
    """Retrieve secret from AWS Secrets Manager."""
    client = boto3.client('secretsmanager')
    
    try:
        response = client.get_secret_value(SecretId=secret_name)
        return response['SecretString']
    except ClientError as e:
        logger.error(f"Failed to retrieve secret: {e}")
        raise

# Usage
jwt_secret = get_secret("s3-storage/jwt-secret")
```

**PII Protection:**
- Never log sensitive data (credentials, tokens, PII)
- Mask sensitive fields in logs
- Use data classification labels
- Implement data retention policies

## Network Security

### VPC Configuration

**Recommended Architecture:**
```
┌─────────────────────────────────────┐
│           Public Subnet             │
│  ┌──────────────┐  ┌─────────────┐ │
│  │ Load Balancer│  │  NAT Gateway│ │
│  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│          Private Subnet              │
│  ┌──────────────┐  ┌─────────────┐ │
│  │  ECS Tasks   │  │  Lambda     │ │
│  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────┘
```

**Security Groups:**
```python
# ALB Security Group
alb_sg = ec2.SecurityGroup(
    "AlbSecurityGroup",
    description="Allow HTTPS traffic",
    vpc=vpc,
    ingress_rules=[
        ec2.IngressRule(
            ip_protocol="tcp",
            from_port=443,
            to_port=443,
            cidr_ipv4="0.0.0.0/0"
        )
    ]
)

# Application Security Group
app_sg = ec2.SecurityGroup(
    "AppSecurityGroup",
    description="Allow traffic from ALB",
    vpc=vpc,
    ingress_rules=[
        ec2.IngressRule(
            ip_protocol="tcp",
            from_port=8000,
            to_port=8000,
            source_security_group=alb_sg
        )
    ]
)
```

### CORS Configuration

**Strict CORS Policy:**
```python
# In main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.yourdomain.com",
        "https://staging.yourdomain.com"
    ],  # Never use "*" in production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600
)
```

### Rate Limiting

**API Rate Limiting:**
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/api/auth/login")
@limiter.limit("5/minute")  # 5 login attempts per minute
async def login(request: Request, data: LoginRequest):
    # Login logic
    pass

@router.post("/api/s3/upload")
@limiter.limit("100/hour")  # 100 uploads per hour
async def upload(request: Request, file: UploadFile):
    # Upload logic
    pass
```

**DDoS Protection:**
- Use AWS WAF with rate-based rules
- Implement CloudFront for DDoS mitigation
- Set up AWS Shield (Standard/Advanced)

## Audit and Compliance

### Audit Logging

**Comprehensive Audit Trail:**
```python
def audit_log(
    user_id: str,
    action: str,
    resource: str,
    status: str,
    details: Dict[str, Any] = None,
    ip_address: str = None,
    user_agent: str = None
):
    """Log audit events for compliance."""
    logger = logging.getLogger("audit")
    
    audit_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "user_id": user_id,
        "action": action,
        "resource": resource,
        "status": status,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "details": details
    }
    
    # Log to CloudWatch
    logger.info(json.dumps(audit_data))
    
    # Optionally: Send to dedicated audit log stream
    # cloudwatch_logs.put_log_events(...)
```

**Events to Audit:**
- User authentication (login, logout, failed attempts)
- Password changes and resets
- Access key creation and deletion
- S3 operations (upload, download, delete)
- Permission changes
- Configuration modifications

### CloudTrail Integration

Enable CloudTrail for all API calls:
```python
trail = cloudtrail.Trail(
    "S3StorageTrail",
    is_multi_region_trail=True,
    include_global_service_events=True,
    enable_log_file_validation=True,
    s3_bucket_name=audit_logs_bucket.bucket_name,
    cloud_watch_logs_log_group=log_group,
    send_to_cloud_watch_logs=True
)

# Enable S3 data events
trail.add_s3_event_selector(
    s3_selector=[{
        "bucket": storage_bucket.bucket_name,
        "object_prefix": ""
    }],
    include_management_events=True,
    read_write_type="All"
)
```

### Compliance Standards

**GDPR Considerations:**
- User data deletion (right to be forgotten)
- Data portability (export functionality)
- Consent management
- Data processing agreements

**HIPAA Considerations:**
- Encrypt PHI at rest and in transit
- Implement access controls and audit logs
- Use BAA-compliant AWS services
- Regular security assessments

## Incident Response

### Security Incident Workflow

1. **Detection**: CloudWatch Alarms, GuardDuty findings
2. **Containment**: Isolate affected resources
3. **Investigation**: Review logs, analyze impact
4. **Remediation**: Fix vulnerabilities, rotate credentials
5. **Recovery**: Restore normal operations
6. **Post-incident**: Document lessons learned

### Automated Response

**Lambda Function for Incident Response:**
```python
import boto3

def lambda_handler(event, context):
    """Respond to security events automatically."""
    
    # Example: Disable compromised access key
    if event['detail']['eventName'] == 'UnauthorizedAccess':
        iam = boto3.client('iam')
        access_key_id = event['detail']['accessKeyId']
        
        iam.update_access_key(
            AccessKeyId=access_key_id,
            Status='Inactive'
        )
        
        # Notify security team
        sns = boto3.client('sns')
        sns.publish(
            TopicArn='arn:aws:sns:region:account:security-alerts',
            Subject='Security Alert: Access Key Disabled',
            Message=f'Access key {access_key_id} disabled due to unauthorized access'
        )
```

### Breach Notification

Prepare breach notification process:
1. Identify affected users
2. Assess data exposure
3. Notify users within regulatory timeframe
4. Report to authorities if required
5. Provide remediation steps

## Security Checklist

### Pre-Production

- [ ] All secrets in AWS Secrets Manager
- [ ] MFA enabled for all admin accounts
- [ ] CloudTrail enabled and monitored
- [ ] GuardDuty enabled
- [ ] Security Hub enabled
- [ ] Config rules configured
- [ ] Backup and recovery tested
- [ ] Disaster recovery plan documented
- [ ] Security scanning (SAST/DAST) completed
- [ ] Penetration testing completed
- [ ] Security review completed

### Production Monitoring

- [ ] CloudWatch alarms configured
- [ ] Log aggregation configured
- [ ] Anomaly detection enabled
- [ ] Regular security assessments scheduled
- [ ] Patch management process defined
- [ ] Incident response plan tested
- [ ] Security training completed
- [ ] Third-party security audit (annual)

### Regular Maintenance

- [ ] Review and rotate credentials (quarterly)
- [ ] Review access logs (weekly)
- [ ] Update dependencies (monthly)
- [ ] Security patch deployment (as needed)
- [ ] Review IAM policies (quarterly)
- [ ] Audit user access (monthly)
- [ ] Review security group rules (quarterly)
- [ ] Test backup restoration (monthly)

## Security Contact

For security issues or vulnerabilities:
- **Email**: security@yourdomain.com
- **PGP Key**: [Link to public key]
- **Responsible Disclosure**: 90-day disclosure policy

## Additional Resources

- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [AWS Well-Architected Framework - Security Pillar](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

import boto3
from botocore.exceptions import ClientError
from typing import List, Dict, Any
import json
import logging

from config import settings
from utils.security import get_user_s3_prefix

logger = logging.getLogger(__name__)


class CredentialService:
    """Service for managing AWS credentials (STS and IAM)."""
    
    def __init__(self, user_id: str):
        self.sts_client = boto3.client('sts', region_name=settings.aws_region)
        self.iam_client = boto3.client('iam', region_name=settings.aws_region)
        self.user_id = user_id
        self.user_prefix = get_user_s3_prefix(user_id)
    
    def _get_scoped_policy(self) -> str:
        """Generate IAM policy document scoped to user's S3 prefix."""
        policy = {
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
                    "Resource": f"arn:aws:s3:::{settings.s3_bucket_name}/{self.user_prefix}*"
                },
                {
                    "Effect": "Allow",
                    "Action": [
                        "s3:ListBucket",
                        "s3:ListBucketVersions"
                    ],
                    "Resource": f"arn:aws:s3:::{settings.s3_bucket_name}",
                    "Condition": {
                        "StringLike": {
                            "s3:prefix": f"{self.user_prefix}*"
                        }
                    }
                }
            ]
        }
        return json.dumps(policy)
    
    async def get_temporary_credentials(self, duration_seconds: int = 3600) -> Dict[str, Any]:
        """Generate temporary STS credentials scoped to user's prefix."""
        try:
            # Validate duration
            if duration_seconds < settings.sts_min_duration:
                duration_seconds = settings.sts_min_duration
            elif duration_seconds > settings.sts_max_duration:
                duration_seconds = settings.sts_max_duration
            
            policy = self._get_scoped_policy()
            
            response = self.sts_client.get_federation_token(
                Name=f"user-{self.user_id[:16]}",
                Policy=policy,
                DurationSeconds=duration_seconds
            )
            
            credentials = response['Credentials']
            
            return {
                "access_key_id": credentials['AccessKeyId'],
                "secret_access_key": credentials['SecretAccessKey'],
                "session_token": credentials['SessionToken'],
                "expiration": credentials['Expiration'].isoformat()
            }
            
        except ClientError as e:
            logger.error(f"Get temporary credentials failed: {str(e)}")
            raise RuntimeError(f"Failed to generate temporary credentials: {str(e)}")
    
    async def create_access_key(self) -> Dict[str, Any]:
        """Create IAM access key for user."""
        try:
            # Note: In production, you would create IAM users per application user
            # This is a simplified implementation
            iam_username = f"s3-user-{self.user_id}"
            
            # Check if user exists, create if not
            try:
                self.iam_client.get_user(UserName=iam_username)
            except ClientError as e:
                if e.response['Error']['Code'] == 'NoSuchEntity':
                    # Create user
                    self.iam_client.create_user(UserName=iam_username)
                    
                    # Attach inline policy
                    policy = self._get_scoped_policy()
                    self.iam_client.put_user_policy(
                        UserName=iam_username,
                        PolicyName=f"S3Access-{self.user_id}",
                        PolicyDocument=policy
                    )
            
            # Create access key
            response = self.iam_client.create_access_key(UserName=iam_username)
            
            access_key = response['AccessKey']
            
            return {
                "access_key_id": access_key['AccessKeyId'],
                "secret_access_key": access_key['SecretAccessKey'],
                "create_date": access_key['CreateDate'].isoformat(),
                "status": access_key['Status']
            }
            
        except ClientError as e:
            logger.error(f"Create access key failed: {str(e)}")
            raise RuntimeError(f"Failed to create access key: {str(e)}")
    
    async def list_access_keys(self) -> List[Dict[str, Any]]:
        """List IAM access keys for user."""
        try:
            iam_username = f"s3-user-{self.user_id}"
            
            try:
                response = self.iam_client.list_access_keys(UserName=iam_username)
                
                keys = []
                for key in response['AccessKeyMetadata']:
                    keys.append({
                        "access_key_id": key['AccessKeyId'],
                        "create_date": key['CreateDate'].isoformat(),
                        "status": key['Status']
                    })
                
                return keys
                
            except ClientError as e:
                if e.response['Error']['Code'] == 'NoSuchEntity':
                    return []
                raise
            
        except ClientError as e:
            logger.error(f"List access keys failed: {str(e)}")
            raise RuntimeError(f"Failed to list access keys: {str(e)}")
    
    async def delete_access_key(self, access_key_id: str) -> None:
        """Delete IAM access key."""
        try:
            iam_username = f"s3-user-{self.user_id}"
            
            self.iam_client.delete_access_key(
                UserName=iam_username,
                AccessKeyId=access_key_id
            )
            
        except ClientError as e:
            logger.error(f"Delete access key failed: {str(e)}")
            raise RuntimeError(f"Failed to delete access key: {str(e)}")
    
    async def update_access_key_status(self, access_key_id: str, status: str) -> None:
        """Update IAM access key status (Active/Inactive)."""
        try:
            iam_username = f"s3-user-{self.user_id}"
            
            self.iam_client.update_access_key(
                UserName=iam_username,
                AccessKeyId=access_key_id,
                Status=status
            )
            
        except ClientError as e:
            logger.error(f"Update access key status failed: {str(e)}")
            raise RuntimeError(f"Failed to update access key status: {str(e)}")

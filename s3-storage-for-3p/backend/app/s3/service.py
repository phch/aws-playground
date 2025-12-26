import boto3
from botocore.exceptions import ClientError
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

from config import settings
from utils.security import get_user_s3_prefix, validate_s3_key_access
from app.models.schemas import S3Object, S3ListResponse, ObjectMetadataResponse, ObjectVersion

logger = logging.getLogger(__name__)


class S3Service:
    """Service for S3 operations with user-scoped access control."""
    
    def __init__(self, user_id: str):
        self.s3_client = boto3.client('s3', region_name=settings.aws_region)
        self.bucket_name = settings.s3_bucket_name
        self.user_id = user_id
        self.user_prefix = get_user_s3_prefix(user_id)
    
    def _validate_key(self, key: str) -> None:
        """Validate that the key is within user's allowed prefix."""
        if not validate_s3_key_access(self.user_id, key):
            raise PermissionError(f"Access denied to key: {key}")
    
    async def list_objects(
        self,
        prefix: str = "",
        continuation_token: Optional[str] = None,
        max_keys: int = 100
    ) -> S3ListResponse:
        """List objects with pagination, scoped to user's prefix."""
        try:
            # Ensure prefix is within user's scope
            if not prefix:
                prefix = self.user_prefix
            else:
                self._validate_key(prefix)
            
            params = {
                'Bucket': self.bucket_name,
                'Prefix': prefix,
                'MaxKeys': max_keys,
                'Delimiter': '/'
            }
            
            if continuation_token:
                params['ContinuationToken'] = continuation_token
            
            response = self.s3_client.list_objects_v2(**params)
            
            objects: List[S3Object] = []
            
            # Add folders (common prefixes)
            for prefix_data in response.get('CommonPrefixes', []):
                objects.append(S3Object(
                    key=prefix_data['Prefix'],
                    size=0,
                    last_modified="",
                    etag="",
                    storage_class="",
                    is_folder=True
                ))
            
            # Add files
            for obj in response.get('Contents', []):
                # Skip the folder marker itself
                if obj['Key'] == prefix:
                    continue
                
                objects.append(S3Object(
                    key=obj['Key'],
                    size=obj['Size'],
                    last_modified=obj['LastModified'].isoformat(),
                    etag=obj['ETag'].strip('"'),
                    storage_class=obj.get('StorageClass', 'STANDARD'),
                    is_folder=False
                ))
            
            return S3ListResponse(
                objects=objects,
                prefix=prefix,
                continuation_token=response.get('NextContinuationToken'),
                has_more=response.get('IsTruncated', False)
            )
            
        except ClientError as e:
            logger.error(f"List objects failed: {str(e)}")
            raise RuntimeError(f"Failed to list objects: {str(e)}")
    
    async def upload_object(self, key: str, file_content: bytes, content_type: str = None) -> Dict[str, Any]:
        """Upload an object to S3."""
        try:
            self._validate_key(key)
            
            params = {
                'Bucket': self.bucket_name,
                'Key': key,
                'Body': file_content
            }
            
            if content_type:
                params['ContentType'] = content_type
            
            response = self.s3_client.put_object(**params)
            
            return {
                'key': key,
                'etag': response['ETag'].strip('"')
            }
            
        except ClientError as e:
            logger.error(f"Upload failed for {key}: {str(e)}")
            raise RuntimeError(f"Failed to upload object: {str(e)}")
    
    async def delete_object(self, key: str) -> None:
        """Delete an object from S3."""
        try:
            self._validate_key(key)
            
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=key
            )
            
        except ClientError as e:
            logger.error(f"Delete failed for {key}: {str(e)}")
            raise RuntimeError(f"Failed to delete object: {str(e)}")
    
    async def delete_multiple_objects(self, keys: List[str]) -> Dict[str, Any]:
        """Delete multiple objects from S3."""
        try:
            # Validate all keys first
            for key in keys:
                self._validate_key(key)
            
            objects = [{'Key': key} for key in keys]
            
            response = self.s3_client.delete_objects(
                Bucket=self.bucket_name,
                Delete={'Objects': objects}
            )
            
            deleted = [obj['Key'] for obj in response.get('Deleted', [])]
            errors = response.get('Errors', [])
            
            return {
                'deleted': deleted,
                'errors': errors
            }
            
        except ClientError as e:
            logger.error(f"Batch delete failed: {str(e)}")
            raise RuntimeError(f"Failed to delete objects: {str(e)}")
    
    async def get_download_url(self, key: str, expires_in: int = None) -> Dict[str, Any]:
        """Generate a pre-signed URL for downloading an object."""
        try:
            self._validate_key(key)
            
            if expires_in is None:
                expires_in = settings.presigned_url_expiration
            
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': key
                },
                ExpiresIn=expires_in
            )
            
            return {
                'url': url,
                'expires_in': expires_in
            }
            
        except ClientError as e:
            logger.error(f"Generate download URL failed for {key}: {str(e)}")
            raise RuntimeError(f"Failed to generate download URL: {str(e)}")
    
    async def get_object_metadata(self, key: str) -> ObjectMetadataResponse:
        """Get metadata for an object."""
        try:
            self._validate_key(key)
            
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=key
            )
            
            return ObjectMetadataResponse(
                content_type=response.get('ContentType', 'application/octet-stream'),
                content_length=response['ContentLength'],
                last_modified=response['LastModified'].isoformat(),
                etag=response['ETag'].strip('"'),
                version_id=response.get('VersionId'),
                metadata=response.get('Metadata', {})
            )
            
        except ClientError as e:
            logger.error(f"Get metadata failed for {key}: {str(e)}")
            raise RuntimeError(f"Failed to get object metadata: {str(e)}")
    
    async def list_object_versions(self, key: str) -> List[ObjectVersion]:
        """List all versions of an object."""
        try:
            self._validate_key(key)
            
            response = self.s3_client.list_object_versions(
                Bucket=self.bucket_name,
                Prefix=key
            )
            
            versions = []
            for version in response.get('Versions', []):
                if version['Key'] == key:
                    versions.append(ObjectVersion(
                        key=version['Key'],
                        version_id=version['VersionId'],
                        is_latest=version['IsLatest'],
                        last_modified=version['LastModified'].isoformat(),
                        size=version['Size'],
                        etag=version['ETag'].strip('"')
                    ))
            
            return versions
            
        except ClientError as e:
            logger.error(f"List versions failed for {key}: {str(e)}")
            raise RuntimeError(f"Failed to list object versions: {str(e)}")
    
    async def create_folder(self, prefix: str) -> None:
        """Create a folder (by creating an empty object with trailing slash)."""
        try:
            # Ensure prefix ends with /
            if not prefix.endswith('/'):
                prefix += '/'
            
            self._validate_key(prefix)
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=prefix,
                Body=b''
            )
            
        except ClientError as e:
            logger.error(f"Create folder failed for {prefix}: {str(e)}")
            raise RuntimeError(f"Failed to create folder: {str(e)}")
    
    async def search_objects(self, prefix: str, search_term: str) -> List[S3Object]:
        """Search for objects by name within a prefix."""
        try:
            if not prefix:
                prefix = self.user_prefix
            else:
                self._validate_key(prefix)
            
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            objects = []
            search_lower = search_term.lower()
            
            for obj in response.get('Contents', []):
                if search_lower in obj['Key'].lower():
                    objects.append(S3Object(
                        key=obj['Key'],
                        size=obj['Size'],
                        last_modified=obj['LastModified'].isoformat(),
                        etag=obj['ETag'].strip('"'),
                        storage_class=obj.get('StorageClass', 'STANDARD'),
                        is_folder=False
                    ))
            
            return objects
            
        except ClientError as e:
            logger.error(f"Search failed: {str(e)}")
            raise RuntimeError(f"Failed to search objects: {str(e)}")
    
    async def initiate_multipart_upload(self, key: str, content_type: str = None) -> str:
        """Initiate a multipart upload."""
        try:
            self._validate_key(key)
            
            params = {
                'Bucket': self.bucket_name,
                'Key': key
            }
            
            if content_type:
                params['ContentType'] = content_type
            
            response = self.s3_client.create_multipart_upload(**params)
            return response['UploadId']
            
        except ClientError as e:
            logger.error(f"Initiate multipart upload failed for {key}: {str(e)}")
            raise RuntimeError(f"Failed to initiate multipart upload: {str(e)}")
    
    async def complete_multipart_upload(
        self,
        key: str,
        upload_id: str,
        parts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Complete a multipart upload."""
        try:
            self._validate_key(key)
            
            response = self.s3_client.complete_multipart_upload(
                Bucket=self.bucket_name,
                Key=key,
                UploadId=upload_id,
                MultipartUpload={'Parts': parts}
            )
            
            return {
                'key': key,
                'etag': response['ETag'].strip('"')
            }
            
        except ClientError as e:
            logger.error(f"Complete multipart upload failed for {key}: {str(e)}")
            raise RuntimeError(f"Failed to complete multipart upload: {str(e)}")
    
    def get_user_prefix(self) -> str:
        """Get the user's S3 prefix."""
        return self.user_prefix

"""
Tests for S3 service layer.
"""
import pytest
from unittest.mock import Mock, patch
from botocore.exceptions import ClientError

from app.s3.service import S3Service
from app.models.schemas import S3Object


class TestS3Service:
    """Test cases for S3Service."""

    @pytest.fixture
    def s3_service(self):
        with patch('boto3.client'):
            with patch('config.settings.s3_bucket_name', 'test-bucket'):
                return S3Service(user_id='test-user-123')

    @pytest.mark.asyncio
    async def test_list_objects_success(self, s3_service):
        """Test successful object listing."""
        s3_service.s3_client.list_objects_v2 = Mock(return_value={
            'Contents': [
                {
                    'Key': 'users/test-user-123/file1.txt',
                    'Size': 1024,
                    'LastModified': Mock(isoformat=lambda: '2024-01-01T00:00:00'),
                    'ETag': '"abc123"',
                    'StorageClass': 'STANDARD'
                }
            ],
            'CommonPrefixes': [
                {'Prefix': 'users/test-user-123/folder1/'}
            ],
            'IsTruncated': False
        })
        
        result = await s3_service.list_objects()
        
        assert len(result.objects) == 2
        assert result.has_more == False
        assert any(obj.is_folder for obj in result.objects)

    @pytest.mark.asyncio
    async def test_upload_object_success(self, s3_service):
        """Test successful object upload."""
        s3_service.s3_client.put_object = Mock(return_value={
            'ETag': '"def456"'
        })
        
        result = await s3_service.upload_object(
            key='users/test-user-123/test.txt',
            file_content=b'test content',
            content_type='text/plain'
        )
        
        assert result['key'] == 'users/test-user-123/test.txt'
        assert result['etag'] == 'def456'

    @pytest.mark.asyncio
    async def test_upload_object_unauthorized_key(self, s3_service):
        """Test upload to unauthorized prefix."""
        with pytest.raises(PermissionError):
            await s3_service.upload_object(
                key='users/other-user/test.txt',
                file_content=b'test content'
            )

    @pytest.mark.asyncio
    async def test_delete_object_success(self, s3_service):
        """Test successful object deletion."""
        s3_service.s3_client.delete_object = Mock()
        
        await s3_service.delete_object('users/test-user-123/test.txt')
        
        s3_service.s3_client.delete_object.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_download_url(self, s3_service):
        """Test pre-signed URL generation."""
        s3_service.s3_client.generate_presigned_url = Mock(
            return_value='https://test-bucket.s3.amazonaws.com/test.txt?signature=abc'
        )
        
        result = await s3_service.get_download_url('users/test-user-123/test.txt')
        
        assert 'url' in result
        assert 'expires_in' in result
        assert result['url'].startswith('https://')

    @pytest.mark.asyncio
    async def test_create_folder_success(self, s3_service):
        """Test folder creation."""
        s3_service.s3_client.put_object = Mock()
        
        await s3_service.create_folder('users/test-user-123/newfolder')
        
        s3_service.s3_client.put_object.assert_called_once()
        call_args = s3_service.s3_client.put_object.call_args
        assert call_args[1]['Key'].endswith('/')

    @pytest.mark.asyncio
    async def test_list_object_versions(self, s3_service):
        """Test object version listing."""
        s3_service.s3_client.list_object_versions = Mock(return_value={
            'Versions': [
                {
                    'Key': 'users/test-user-123/test.txt',
                    'VersionId': 'v1',
                    'IsLatest': True,
                    'LastModified': Mock(isoformat=lambda: '2024-01-01T00:00:00'),
                    'Size': 1024,
                    'ETag': '"abc123"'
                },
                {
                    'Key': 'users/test-user-123/test.txt',
                    'VersionId': 'v2',
                    'IsLatest': False,
                    'LastModified': Mock(isoformat=lambda: '2024-01-01T00:00:00'),
                    'Size': 512,
                    'ETag': '"def456"'
                }
            ]
        })
        
        versions = await s3_service.list_object_versions('users/test-user-123/test.txt')
        
        assert len(versions) == 2
        assert versions[0].is_latest == True

    @pytest.mark.asyncio
    async def test_search_objects(self, s3_service):
        """Test object search functionality."""
        s3_service.s3_client.list_objects_v2 = Mock(return_value={
            'Contents': [
                {
                    'Key': 'users/test-user-123/document.pdf',
                    'Size': 2048,
                    'LastModified': Mock(isoformat=lambda: '2024-01-01T00:00:00'),
                    'ETag': '"abc123"',
                    'StorageClass': 'STANDARD'
                },
                {
                    'Key': 'users/test-user-123/image.png',
                    'Size': 4096,
                    'LastModified': Mock(isoformat=lambda: '2024-01-01T00:00:00'),
                    'ETag': '"def456"',
                    'StorageClass': 'STANDARD'
                }
            ]
        })
        
        results = await s3_service.search_objects('', 'document')
        
        assert len(results) == 1
        assert 'document' in results[0].key.lower()

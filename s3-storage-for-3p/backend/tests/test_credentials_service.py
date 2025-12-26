"""
Tests for credential management service.
"""
import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

from app.credentials.service import CredentialService


class TestCredentialService:
    """Test cases for CredentialService."""

    @pytest.fixture
    def credential_service(self):
        with patch('boto3.client'):
            return CredentialService(user_id='test-user-123')

    @pytest.mark.asyncio
    async def test_get_temporary_credentials_success(self, credential_service):
        """Test successful temporary credential generation."""
        expiration = datetime.utcnow() + timedelta(hours=1)
        
        credential_service.sts_client.get_federation_token = Mock(return_value={
            'Credentials': {
                'AccessKeyId': 'ASIATESTACCESSKEY',
                'SecretAccessKey': 'TestSecretAccessKey',
                'SessionToken': 'TestSessionToken',
                'Expiration': expiration
            }
        })
        
        result = await credential_service.get_temporary_credentials(3600)
        
        assert result['access_key_id'] == 'ASIATESTACCESSKEY'
        assert result['session_token'] == 'TestSessionToken'
        assert 'expiration' in result

    @pytest.mark.asyncio
    async def test_get_temporary_credentials_validates_duration(self, credential_service):
        """Test that duration is validated against min/max."""
        expiration = datetime.utcnow() + timedelta(minutes=15)
        
        credential_service.sts_client.get_federation_token = Mock(return_value={
            'Credentials': {
                'AccessKeyId': 'ASIATESTACCESSKEY',
                'SecretAccessKey': 'TestSecretAccessKey',
                'SessionToken': 'TestSessionToken',
                'Expiration': expiration
            }
        })
        
        # Request duration less than minimum (900 seconds)
        result = await credential_service.get_temporary_credentials(300)
        
        # Service should adjust to minimum
        call_args = credential_service.sts_client.get_federation_token.call_args
        assert call_args[1]['DurationSeconds'] >= 900

    @pytest.mark.asyncio
    async def test_create_access_key_new_user(self, credential_service):
        """Test access key creation for new IAM user."""
        credential_service.iam_client.get_user = Mock(
            side_effect=ClientError(
                {'Error': {'Code': 'NoSuchEntity', 'Message': 'User does not exist'}},
                'GetUser'
            )
        )
        credential_service.iam_client.create_user = Mock()
        credential_service.iam_client.put_user_policy = Mock()
        credential_service.iam_client.create_access_key = Mock(return_value={
            'AccessKey': {
                'AccessKeyId': 'AKIATEST',
                'SecretAccessKey': 'TestSecret',
                'CreateDate': datetime.utcnow(),
                'Status': 'Active'
            }
        })
        
        result = await credential_service.create_access_key()
        
        assert result['access_key_id'] == 'AKIATEST'
        assert result['status'] == 'Active'
        credential_service.iam_client.create_user.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_access_key_existing_user(self, credential_service):
        """Test access key creation for existing IAM user."""
        credential_service.iam_client.get_user = Mock(return_value={
            'User': {'UserName': 's3-user-test-user-123'}
        })
        credential_service.iam_client.create_access_key = Mock(return_value={
            'AccessKey': {
                'AccessKeyId': 'AKIATEST',
                'SecretAccessKey': 'TestSecret',
                'CreateDate': datetime.utcnow(),
                'Status': 'Active'
            }
        })
        
        result = await credential_service.create_access_key()
        
        assert result['access_key_id'] == 'AKIATEST'
        credential_service.iam_client.create_user.assert_not_called()

    @pytest.mark.asyncio
    async def test_list_access_keys(self, credential_service):
        """Test listing access keys."""
        credential_service.iam_client.list_access_keys = Mock(return_value={
            'AccessKeyMetadata': [
                {
                    'AccessKeyId': 'AKIATEST1',
                    'CreateDate': datetime.utcnow(),
                    'Status': 'Active'
                },
                {
                    'AccessKeyId': 'AKIATEST2',
                    'CreateDate': datetime.utcnow(),
                    'Status': 'Inactive'
                }
            ]
        })
        
        keys = await credential_service.list_access_keys()
        
        assert len(keys) == 2
        assert keys[0]['access_key_id'] == 'AKIATEST1'
        assert keys[0]['status'] == 'Active'

    @pytest.mark.asyncio
    async def test_list_access_keys_no_user(self, credential_service):
        """Test listing access keys when user doesn't exist."""
        credential_service.iam_client.list_access_keys = Mock(
            side_effect=ClientError(
                {'Error': {'Code': 'NoSuchEntity', 'Message': 'User does not exist'}},
                'ListAccessKeys'
            )
        )
        
        keys = await credential_service.list_access_keys()
        
        assert keys == []

    @pytest.mark.asyncio
    async def test_delete_access_key(self, credential_service):
        """Test access key deletion."""
        credential_service.iam_client.delete_access_key = Mock()
        
        await credential_service.delete_access_key('AKIATEST')
        
        credential_service.iam_client.delete_access_key.assert_called_once_with(
            UserName='s3-user-test-user-123',
            AccessKeyId='AKIATEST'
        )

    @pytest.mark.asyncio
    async def test_update_access_key_status(self, credential_service):
        """Test updating access key status."""
        credential_service.iam_client.update_access_key = Mock()
        
        await credential_service.update_access_key_status('AKIATEST', 'Inactive')
        
        credential_service.iam_client.update_access_key.assert_called_once_with(
            UserName='s3-user-test-user-123',
            AccessKeyId='AKIATEST',
            Status='Inactive'
        )

    def test_get_scoped_policy(self, credential_service):
        """Test that generated policy is properly scoped."""
        policy_json = credential_service._get_scoped_policy()
        
        import json
        policy = json.loads(policy_json)
        
        assert 'Statement' in policy
        assert len(policy['Statement']) >= 2
        
        # Check resource scoping
        object_statement = [s for s in policy['Statement'] if 's3:GetObject' in s['Action']][0]
        assert 'users/test-user-123/' in object_statement['Resource']
        
        # Check list bucket condition
        list_statement = [s for s in policy['Statement'] if 's3:ListBucket' in s['Action']][0]
        assert 'Condition' in list_statement
        assert 's3:prefix' in list_statement['Condition']['StringLike']

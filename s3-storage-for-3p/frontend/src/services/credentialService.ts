import api from '../utils/axios';
import { AwsCredentials, IamAccessKey } from '../types';

export const credentialService = {
  // Get temporary STS credentials
  getTemporaryCredentials: async (durationSeconds?: number): Promise<AwsCredentials> => {
    const response = await api.post('/api/credentials/temporary', {
      durationSeconds: durationSeconds || 3600,
    });
    return response.data;
  },

  // Create IAM access key
  createAccessKey: async (): Promise<IamAccessKey> => {
    const response = await api.post('/api/credentials/access-key');
    return response.data;
  },

  // List IAM access keys
  listAccessKeys: async (): Promise<IamAccessKey[]> => {
    const response = await api.get('/api/credentials/access-keys');
    return response.data;
  },

  // Delete IAM access key
  deleteAccessKey: async (accessKeyId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/api/credentials/access-key/${accessKeyId}`);
    return response.data;
  },

  // Update access key status
  updateAccessKeyStatus: async (
    accessKeyId: string,
    status: 'Active' | 'Inactive'
  ): Promise<{ message: string }> => {
    const response = await api.put(`/api/credentials/access-key/${accessKeyId}/status`, {
      status,
    });
    return response.data;
  },

  // Rotate access key
  rotateAccessKey: async (oldAccessKeyId: string): Promise<IamAccessKey> => {
    const response = await api.post('/api/credentials/access-key/rotate', {
      oldAccessKeyId,
    });
    return response.data;
  },

  // Download credentials file in AWS CLI format
  downloadCredentialsFile: (credentials: AwsCredentials, format: 'cli' | 'env' = 'cli'): void => {
    let content = '';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (format === 'cli') {
      content = `[default]
aws_access_key_id = ${credentials.accessKeyId}
aws_secret_access_key = ${credentials.secretAccessKey}
aws_session_token = ${credentials.sessionToken}
# Expires: ${credentials.expiration}
`;
    } else {
      content = `export AWS_ACCESS_KEY_ID="${credentials.accessKeyId}"
export AWS_SECRET_ACCESS_KEY="${credentials.secretAccessKey}"
export AWS_SESSION_TOKEN="${credentials.sessionToken}"
# Expires: ${credentials.expiration}
`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aws-credentials-${timestamp}.${format === 'cli' ? 'txt' : 'sh'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

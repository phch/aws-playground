import api from '../utils/axios';
import {
  S3ListResponse,
  S3Object,
  S3ObjectVersion,
  ObjectMetadata,
  UploadProgress,
} from '../types';

export const s3Service = {
  // List objects in S3 with pagination
  listObjects: async (
    prefix: string = '',
    continuationToken?: string,
    maxKeys: number = 100
  ): Promise<S3ListResponse> => {
    const params = new URLSearchParams({
      prefix,
      maxKeys: maxKeys.toString(),
    });

    if (continuationToken) {
      params.append('continuationToken', continuationToken);
    }

    const response = await api.get(`/api/s3/objects?${params.toString()}`);
    return response.data;
  },

  // Upload a single file
  uploadFile: async (
    file: File,
    key: string,
    onProgress?: (progress: number) => void
  ): Promise<{ key: string; etag: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('key', key);

    const response = await api.post('/api/s3/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  },

  // Upload multiple files
  uploadMultipleFiles: async (
    files: File[],
    prefix: string,
    onFileProgress?: (fileIndex: number, progress: number) => void
  ): Promise<{ key: string; etag: string }[]> => {
    const uploadPromises = files.map((file, index) => {
      const key = `${prefix}${file.name}`;
      return s3Service.uploadFile(file, key, (progress) => {
        if (onFileProgress) {
          onFileProgress(index, progress);
        }
      });
    });

    return Promise.all(uploadPromises);
  },

  // Initiate multipart upload for large files
  initiateMultipartUpload: async (key: string): Promise<{ uploadId: string }> => {
    const response = await api.post('/api/s3/multipart/initiate', { key });
    return response.data;
  },

  // Upload a part of multipart upload
  uploadPart: async (
    key: string,
    uploadId: string,
    partNumber: number,
    data: Blob
  ): Promise<{ etag: string }> => {
    const formData = new FormData();
    formData.append('data', data);
    formData.append('key', key);
    formData.append('uploadId', uploadId);
    formData.append('partNumber', partNumber.toString());

    const response = await api.post('/api/s3/multipart/upload-part', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  // Complete multipart upload
  completeMultipartUpload: async (
    key: string,
    uploadId: string,
    parts: { partNumber: number; etag: string }[]
  ): Promise<{ key: string; etag: string }> => {
    const response = await api.post('/api/s3/multipart/complete', {
      key,
      uploadId,
      parts,
    });
    return response.data;
  },

  // Download a file (returns pre-signed URL)
  getDownloadUrl: async (key: string): Promise<{ url: string; expiresIn: number }> => {
    const response = await api.post('/api/s3/download', { key });
    return response.data;
  },

  // Delete an object
  deleteObject: async (key: string): Promise<{ message: string }> => {
    const response = await api.delete('/api/s3/object', {
      data: { key },
    });
    return response.data;
  },

  // Delete multiple objects
  deleteMultipleObjects: async (keys: string[]): Promise<{ deleted: string[]; errors: any[] }> => {
    const response = await api.delete('/api/s3/objects', {
      data: { keys },
    });
    return response.data;
  },

  // Get object metadata
  getObjectMetadata: async (key: string): Promise<ObjectMetadata> => {
    const response = await api.get(`/api/s3/object/metadata?key=${encodeURIComponent(key)}`);
    return response.data;
  },

  // List object versions
  listObjectVersions: async (key: string): Promise<S3ObjectVersion[]> => {
    const response = await api.get(`/api/s3/object/versions?key=${encodeURIComponent(key)}`);
    return response.data;
  },

  // Create folder
  createFolder: async (prefix: string): Promise<{ message: string }> => {
    const response = await api.post('/api/s3/folder', { prefix });
    return response.data;
  },

  // Search objects
  searchObjects: async (prefix: string, searchTerm: string): Promise<S3Object[]> => {
    const response = await api.get(
      `/api/s3/search?prefix=${encodeURIComponent(prefix)}&query=${encodeURIComponent(searchTerm)}`
    );
    return response.data;
  },

  // Get user's S3 prefix
  getUserPrefix: async (): Promise<{ prefix: string }> => {
    const response = await api.get('/api/s3/user-prefix');
    return response.data;
  },
};

export interface User {
  id: string;
  username: string;
  email: string;
  attributes?: Record<string, string>;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: string;
}

export interface IamAccessKey {
  accessKeyId: string;
  secretAccessKey: string;
  createDate: string;
  status: 'Active' | 'Inactive';
}

export interface S3Object {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
  storageClass: string;
  isFolder?: boolean;
}

export interface S3ObjectVersion {
  key: string;
  versionId: string;
  isLatest: boolean;
  lastModified: string;
  size: number;
  etag: string;
}

export interface S3ListResponse {
  objects: S3Object[];
  continuationToken?: string;
  hasMore: boolean;
  prefix: string;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
}

export interface ObjectMetadata {
  contentType: string;
  contentLength: number;
  lastModified: string;
  etag: string;
  versionId?: string;
  metadata?: Record<string, string>;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

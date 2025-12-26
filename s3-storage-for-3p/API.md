# API Documentation

Complete REST API documentation for the S3 Storage Browser backend.

## Base URL

```
Development: http://localhost:8000
Production: https://api.yourdomain.com
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Response Format

All responses follow this format:

**Success Response:**
```json
{
  "data": { ... },
  "message": "Success message"
}
```

**Error Response:**
```json
{
  "detail": "Error message",
  "code": "ERROR_CODE"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Authentication Endpoints

### Register User

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "message": "User registered successfully. Please check your email for verification code."
}
```

**Errors:**
- `400` - Invalid input (weak password, invalid email)
- `400` - Username already exists

---

### Confirm Registration

Verify email with confirmation code.

**Endpoint:** `POST /api/auth/confirm`

**Request:**
```json
{
  "username": "johndoe",
  "code": "123456"
}
```

**Response:** `200 OK`
```json
{
  "message": "Email verified successfully"
}
```

---

### Resend Confirmation Code

Resend email verification code.

**Endpoint:** `POST /api/auth/resend-code`

**Request:**
```json
{
  "username": "johndoe"
}
```

**Response:** `200 OK`
```json
{
  "message": "Confirmation code sent"
}
```

---

### Login

Authenticate and receive tokens.

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "username": "johndoe",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

**Errors:**
- `401` - Incorrect username or password
- `401` - User email not verified

---

### Refresh Token

Get new access token using refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Logout

Logout and invalidate tokens.

**Endpoint:** `POST /api/auth/logout`
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

### Get Current User

Get authenticated user information.

**Endpoint:** `GET /api/auth/me`
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "id": "user-uuid",
  "username": "johndoe",
  "email": "john@example.com",
  "attributes": {}
}
```

---

### Forgot Password

Initiate password reset flow.

**Endpoint:** `POST /api/auth/forgot-password`

**Request:**
```json
{
  "username": "johndoe"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password reset code sent to your email"
}
```

---

### Reset Password

Reset password with confirmation code.

**Endpoint:** `POST /api/auth/reset-password`

**Request:**
```json
{
  "username": "johndoe",
  "code": "123456",
  "new_password": "NewSecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password reset successfully"
}
```

---

### Change Password

Change password for authenticated user.

**Endpoint:** `POST /api/auth/change-password`
**Auth Required:** Yes

**Request:**
```json
{
  "old_password": "SecurePass123",
  "new_password": "NewSecurePass456"
}
```

**Response:** `200 OK`
```json
{
  "message": "Password changed successfully"
}
```

---

## S3 Operations Endpoints

### List Objects

List S3 objects within user's prefix with pagination.

**Endpoint:** `GET /api/s3/objects`
**Auth Required:** Yes

**Query Parameters:**
- `prefix` (optional) - S3 prefix to list (default: user's root prefix)
- `continuation_token` (optional) - Token for pagination
- `max_keys` (optional) - Maximum objects to return (default: 100)

**Response:** `200 OK`
```json
{
  "objects": [
    {
      "key": "users/user-uuid/folder/file.txt",
      "size": 1024,
      "last_modified": "2024-01-01T00:00:00",
      "etag": "abc123",
      "storage_class": "STANDARD",
      "is_folder": false
    },
    {
      "key": "users/user-uuid/subfolder/",
      "size": 0,
      "last_modified": "",
      "etag": "",
      "storage_class": "",
      "is_folder": true
    }
  ],
  "prefix": "users/user-uuid/",
  "continuation_token": "next-page-token",
  "has_more": true
}
```

---

### Upload Object

Upload a file to S3.

**Endpoint:** `POST /api/s3/upload`
**Auth Required:** Yes
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` - File to upload
- `key` - S3 key (must be within user's prefix)

**Response:** `200 OK`
```json
{
  "key": "users/user-uuid/uploaded-file.txt",
  "etag": "def456",
  "message": "File uploaded successfully"
}
```

**Errors:**
- `403` - Key outside user's prefix
- `413` - File too large (>100MB)

---

### Delete Object

Delete a single object from S3.

**Endpoint:** `DELETE /api/s3/object`
**Auth Required:** Yes

**Request:**
```json
{
  "key": "users/user-uuid/file-to-delete.txt"
}
```

**Response:** `200 OK`
```json
{
  "message": "Object deleted successfully"
}
```

---

### Delete Multiple Objects

Delete multiple objects in batch.

**Endpoint:** `DELETE /api/s3/objects`
**Auth Required:** Yes

**Request:**
```json
{
  "keys": [
    "users/user-uuid/file1.txt",
    "users/user-uuid/file2.txt"
  ]
}
```

**Response:** `200 OK`
```json
{
  "deleted": [
    "users/user-uuid/file1.txt",
    "users/user-uuid/file2.txt"
  ],
  "errors": []
}
```

---

### Get Download URL

Generate pre-signed URL for downloading an object.

**Endpoint:** `POST /api/s3/download`
**Auth Required:** Yes

**Request:**
```json
{
  "key": "users/user-uuid/file-to-download.txt"
}
```

**Response:** `200 OK`
```json
{
  "url": "https://bucket.s3.amazonaws.com/path?signature=xyz",
  "expires_in": 3600
}
```

---

### Get Object Metadata

Get metadata for an object.

**Endpoint:** `GET /api/s3/object/metadata`
**Auth Required:** Yes

**Query Parameters:**
- `key` - S3 object key

**Response:** `200 OK`
```json
{
  "content_type": "text/plain",
  "content_length": 1024,
  "last_modified": "2024-01-01T00:00:00",
  "etag": "abc123",
  "version_id": "version-id",
  "metadata": {
    "custom-key": "custom-value"
  }
}
```

---

### List Object Versions

List all versions of an object.

**Endpoint:** `GET /api/s3/object/versions`
**Auth Required:** Yes

**Query Parameters:**
- `key` - S3 object key

**Response:** `200 OK`
```json
[
  {
    "key": "users/user-uuid/file.txt",
    "version_id": "v1",
    "is_latest": true,
    "last_modified": "2024-01-02T00:00:00",
    "size": 2048,
    "etag": "def456"
  },
  {
    "key": "users/user-uuid/file.txt",
    "version_id": "v2",
    "is_latest": false,
    "last_modified": "2024-01-01T00:00:00",
    "size": 1024,
    "etag": "abc123"
  }
]
```

---

### Create Folder

Create a new folder (empty object with trailing slash).

**Endpoint:** `POST /api/s3/folder`
**Auth Required:** Yes

**Request:**
```json
{
  "prefix": "users/user-uuid/new-folder"
}
```

**Response:** `200 OK`
```json
{
  "message": "Folder created successfully"
}
```

---

### Search Objects

Search for objects by name within user's prefix.

**Endpoint:** `GET /api/s3/search`
**Auth Required:** Yes

**Query Parameters:**
- `prefix` (optional) - Search within specific prefix
- `query` - Search term

**Response:** `200 OK`
```json
[
  {
    "key": "users/user-uuid/matching-file.txt",
    "size": 1024,
    "last_modified": "2024-01-01T00:00:00",
    "etag": "abc123",
    "storage_class": "STANDARD",
    "is_folder": false
  }
]
```

---

### Get User Prefix

Get the user's S3 prefix.

**Endpoint:** `GET /api/s3/user-prefix`
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "prefix": "users/user-uuid/"
}
```

---

### Initiate Multipart Upload

Start a multipart upload for large files.

**Endpoint:** `POST /api/s3/multipart/initiate`
**Auth Required:** Yes

**Request:**
```json
{
  "key": "users/user-uuid/large-file.zip"
}
```

**Response:** `200 OK`
```json
{
  "upload_id": "multipart-upload-id"
}
```

---

### Complete Multipart Upload

Complete a multipart upload.

**Endpoint:** `POST /api/s3/multipart/complete`
**Auth Required:** Yes

**Request:**
```json
{
  "key": "users/user-uuid/large-file.zip",
  "upload_id": "multipart-upload-id",
  "parts": [
    {
      "part_number": 1,
      "etag": "part1-etag"
    },
    {
      "part_number": 2,
      "etag": "part2-etag"
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "key": "users/user-uuid/large-file.zip",
  "etag": "final-etag",
  "message": "File uploaded successfully"
}
```

---

## Credentials Management Endpoints

### Generate Temporary Credentials

Generate time-limited STS credentials scoped to user's prefix.

**Endpoint:** `POST /api/credentials/temporary`
**Auth Required:** Yes

**Request:**
```json
{
  "duration_seconds": 3600
}
```

**Response:** `200 OK`
```json
{
  "access_key_id": "ASIATESTACCESSKEY",
  "secret_access_key": "SecretAccessKey",
  "session_token": "SessionToken",
  "expiration": "2024-01-01T01:00:00"
}
```

**Notes:**
- Duration must be between 900 (15 min) and 43200 (12 hours) seconds
- Credentials are scoped to user's S3 prefix only

---

### Create Access Key

Create a permanent IAM access key.

**Endpoint:** `POST /api/credentials/access-key`
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "access_key_id": "AKIAIOSFODNN7EXAMPLE",
  "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "create_date": "2024-01-01T00:00:00",
  "status": "Active"
}
```

**Important:** Save the secret_access_key immediately - it won't be shown again!

---

### List Access Keys

List all IAM access keys for the user.

**Endpoint:** `GET /api/credentials/access-keys`
**Auth Required:** Yes

**Response:** `200 OK`
```json
[
  {
    "access_key_id": "AKIAIOSFODNN7EXAMPLE",
    "secret_access_key": null,
    "create_date": "2024-01-01T00:00:00",
    "status": "Active"
  },
  {
    "access_key_id": "AKIAIOSFODNN8EXAMPLE",
    "secret_access_key": null,
    "create_date": "2023-12-01T00:00:00",
    "status": "Inactive"
  }
]
```

---

### Delete Access Key

Delete an IAM access key.

**Endpoint:** `DELETE /api/credentials/access-key/{access_key_id}`
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "message": "Access key deleted successfully"
}
```

---

### Update Access Key Status

Activate or deactivate an access key.

**Endpoint:** `PUT /api/credentials/access-key/{access_key_id}/status`
**Auth Required:** Yes

**Request:**
```json
{
  "status": "Inactive"
}
```

**Response:** `200 OK`
```json
{
  "message": "Access key status updated to Inactive"
}
```

**Valid statuses:** `Active`, `Inactive`

---

### Rotate Access Key

Create a new access key and delete the old one.

**Endpoint:** `POST /api/credentials/access-key/rotate`
**Auth Required:** Yes

**Request:**
```json
{
  "old_access_key_id": "AKIAIOSFODNN7EXAMPLE"
}
```

**Response:** `200 OK`
```json
{
  "access_key_id": "AKIAIOSFODNN9EXAMPLE",
  "secret_access_key": "NewSecretAccessKey",
  "create_date": "2024-01-02T00:00:00",
  "status": "Active"
}
```

---

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

| Endpoint | Rate Limit |
|----------|-----------|
| Authentication | 5 requests/minute |
| S3 Operations | 100 requests/minute |
| Credential Management | 10 requests/minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

**Rate Limit Exceeded Response:** `429 Too Many Requests`
```json
{
  "detail": "Rate limit exceeded. Try again in 60 seconds."
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_CREDENTIALS` | Invalid username or password |
| `USER_NOT_FOUND` | User does not exist |
| `EMAIL_NOT_VERIFIED` | Email verification required |
| `TOKEN_EXPIRED` | Access token has expired |
| `INVALID_TOKEN` | Token is malformed or invalid |
| `PERMISSION_DENIED` | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `VALIDATION_ERROR` | Input validation failed |
| `INTERNAL_ERROR` | Internal server error |

---

## SDK Examples

### Python

```python
import requests

# Login
response = requests.post(
    "http://localhost:8000/api/auth/login",
    json={"username": "johndoe", "password": "SecurePass123"}
)
tokens = response.json()
access_token = tokens["access_token"]

# List objects
headers = {"Authorization": f"Bearer {access_token}"}
response = requests.get(
    "http://localhost:8000/api/s3/objects",
    headers=headers,
    params={"prefix": "users/user-uuid/", "max_keys": 50}
)
objects = response.json()
```

### JavaScript

```javascript
// Login
const loginResponse = await fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'johndoe',
    password: 'SecurePass123'
  })
});
const tokens = await loginResponse.json();

// Upload file
const formData = new FormData();
formData.append('file', file);
formData.append('key', 'users/user-uuid/file.txt');

const uploadResponse = await fetch('http://localhost:8000/api/s3/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${tokens.access_token}`
  },
  body: formData
});
```

### curl

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"johndoe","password":"SecurePass123"}'

# List objects
curl -X GET "http://localhost:8000/api/s3/objects?prefix=users/user-uuid/" \
  -H "Authorization: Bearer <access_token>"

# Upload file
curl -X POST http://localhost:8000/api/s3/upload \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@/path/to/file.txt" \
  -F "key=users/user-uuid/file.txt"
```

---

## Interactive API Documentation

Interactive API documentation is available at:
- **Swagger UI**: `http://localhost:8000/api/docs`
- **ReDoc**: `http://localhost:8000/api/redoc`

(Available in development and staging environments only)

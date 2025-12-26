from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str = Field(..., min_length=8)


class ConfirmRegistrationRequest(BaseModel):
    username: str
    code: str


class ForgotPasswordRequest(BaseModel):
    username: str


class ResetPasswordRequest(BaseModel):
    username: str
    code: str
    new_password: str = Field(..., min_length=8)


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    id_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    attributes: Optional[Dict[str, Any]] = None


# S3 Schemas
class S3Object(BaseModel):
    key: str
    size: int
    last_modified: str
    etag: str
    storage_class: str
    is_folder: bool = False


class S3ListResponse(BaseModel):
    objects: List[S3Object]
    prefix: str
    continuation_token: Optional[str] = None
    has_more: bool = False


class UploadResponse(BaseModel):
    key: str
    etag: str
    message: str = "File uploaded successfully"


class DeleteRequest(BaseModel):
    key: str


class DeleteMultipleRequest(BaseModel):
    keys: List[str]


class DeleteResponse(BaseModel):
    deleted: List[str]
    errors: List[Dict[str, Any]] = []


class DownloadRequest(BaseModel):
    key: str


class DownloadResponse(BaseModel):
    url: str
    expires_in: int


class CreateFolderRequest(BaseModel):
    prefix: str


class ObjectMetadataResponse(BaseModel):
    content_type: str
    content_length: int
    last_modified: str
    etag: str
    version_id: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None


class ObjectVersion(BaseModel):
    key: str
    version_id: str
    is_latest: bool
    last_modified: str
    size: int
    etag: str


class UserPrefixResponse(BaseModel):
    prefix: str


class MultipartUploadInit(BaseModel):
    key: str


class MultipartUploadResponse(BaseModel):
    upload_id: str


class MultipartUploadPart(BaseModel):
    part_number: int
    etag: str


class CompleteMultipartUploadRequest(BaseModel):
    key: str
    upload_id: str
    parts: List[MultipartUploadPart]


# Credentials Schemas
class TemporaryCredentialsRequest(BaseModel):
    duration_seconds: int = Field(default=3600, ge=900, le=43200)


class AwsCredentials(BaseModel):
    access_key_id: str
    secret_access_key: str
    session_token: str
    expiration: str


class IamAccessKey(BaseModel):
    access_key_id: str
    secret_access_key: Optional[str] = None
    create_date: str
    status: str


class UpdateAccessKeyStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(Active|Inactive)$")


class RotateAccessKeyRequest(BaseModel):
    old_access_key_id: str


# Common Response Schemas
class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None

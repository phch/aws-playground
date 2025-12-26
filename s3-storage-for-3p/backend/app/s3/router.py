from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import Dict, Any, Optional
import logging

from app.models.schemas import (
    S3ListResponse,
    UploadResponse,
    DeleteRequest,
    DeleteResponse,
    DeleteMultipleRequest,
    DownloadRequest,
    DownloadResponse,
    CreateFolderRequest,
    MessageResponse,
    ObjectMetadataResponse,
    ObjectVersion,
    UserPrefixResponse,
    MultipartUploadInit,
    MultipartUploadResponse,
    CompleteMultipartUploadRequest,
)
from app.s3.service import S3Service
from utils.security import get_current_user
from utils.logging import audit_log

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/s3", tags=["S3 Operations"])


def get_s3_service(current_user: Dict[str, Any] = Depends(get_current_user)) -> S3Service:
    """Dependency to create S3Service instance for current user."""
    return S3Service(user_id=current_user["id"])


@router.get("/objects", response_model=S3ListResponse)
async def list_objects(
    prefix: str = "",
    continuation_token: Optional[str] = None,
    max_keys: int = 100,
    s3_service: S3Service = Depends(get_s3_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List S3 objects within user's prefix."""
    try:
        result = await s3_service.list_objects(prefix, continuation_token, max_keys)
        
        audit_log(
            user_id=current_user["id"],
            action="list_objects",
            resource=f"s3://{prefix}",
            status="success"
        )
        
        return result
        
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"List objects error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list objects"
        )


@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    key: str = Form(...),
    s3_service: S3Service = Depends(get_s3_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Upload a file to S3."""
    try:
        content = await file.read()
        
        result = await s3_service.upload_object(
            key=key,
            file_content=content,
            content_type=file.content_type
        )
        
        audit_log(
            user_id=current_user["id"],
            action="upload_object",
            resource=f"s3://{key}",
            status="success",
            details={"size": len(content)}
        )
        
        return UploadResponse(**result)
        
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file"
        )


@router.delete("/object", response_model=MessageResponse)
async def delete_object(
    request: DeleteRequest,
    s3_service: S3Service = Depends(get_s3_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete an object from S3."""
    try:
        await s3_service.delete_object(request.key)
        
        audit_log(
            user_id=current_user["id"],
            action="delete_object",
            resource=f"s3://{request.key}",
            status="success"
        )
        
        return MessageResponse(message="Object deleted successfully")
        
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Delete error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete object"
        )


@router.delete("/objects", response_model=DeleteResponse)
async def delete_multiple_objects(
    request: DeleteMultipleRequest,
    s3_service: S3Service = Depends(get_s3_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete multiple objects from S3."""
    try:
        result = await s3_service.delete_multiple_objects(request.keys)
        
        audit_log(
            user_id=current_user["id"],
            action="delete_multiple_objects",
            resource="s3",
            status="success",
            details={"count": len(request.keys)}
        )
        
        return DeleteResponse(**result)
        
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Batch delete error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete objects"
        )


@router.post("/download", response_model=DownloadResponse)
async def get_download_url(
    request: DownloadRequest,
    s3_service: S3Service = Depends(get_s3_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get a pre-signed URL for downloading an object."""
    try:
        result = await s3_service.get_download_url(request.key)
        
        audit_log(
            user_id=current_user["id"],
            action="generate_download_url",
            resource=f"s3://{request.key}",
            status="success"
        )
        
        return DownloadResponse(**result)
        
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Generate download URL error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate download URL"
        )


@router.get("/object/metadata", response_model=ObjectMetadataResponse)
async def get_object_metadata(
    key: str,
    s3_service: S3Service = Depends(get_s3_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get metadata for an object."""
    try:
        result = await s3_service.get_object_metadata(key)
        return result
        
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Get metadata error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get object metadata"
        )


@router.get("/object/versions", response_model=list[ObjectVersion])
async def list_object_versions(
    key: str,
    s3_service: S3Service = Depends(get_s3_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all versions of an object."""
    try:
        versions = await s3_service.list_object_versions(key)
        return versions
        
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"List versions error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list object versions"
        )


@router.post("/folder", response_model=MessageResponse)
async def create_folder(
    request: CreateFolderRequest,
    s3_service: S3Service = Depends(get_s3_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new folder."""
    try:
        await s3_service.create_folder(request.prefix)
        
        audit_log(
            user_id=current_user["id"],
            action="create_folder",
            resource=f"s3://{request.prefix}",
            status="success"
        )
        
        return MessageResponse(message="Folder created successfully")
        
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Create folder error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create folder"
        )


@router.get("/search")
async def search_objects(
    prefix: str = "",
    query: str = "",
    s3_service: S3Service = Depends(get_s3_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Search for objects by name."""
    try:
        objects = await s3_service.search_objects(prefix, query)
        return objects
        
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search objects"
        )


@router.get("/user-prefix", response_model=UserPrefixResponse)
async def get_user_prefix(
    s3_service: S3Service = Depends(get_s3_service)
):
    """Get the user's S3 prefix."""
    return UserPrefixResponse(prefix=s3_service.get_user_prefix())


@router.post("/multipart/initiate", response_model=MultipartUploadResponse)
async def initiate_multipart_upload(
    request: MultipartUploadInit,
    s3_service: S3Service = Depends(get_s3_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Initiate a multipart upload."""
    try:
        upload_id = await s3_service.initiate_multipart_upload(request.key)
        
        audit_log(
            user_id=current_user["id"],
            action="initiate_multipart_upload",
            resource=f"s3://{request.key}",
            status="success"
        )
        
        return MultipartUploadResponse(upload_id=upload_id)
        
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Initiate multipart upload error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate multipart upload"
        )


@router.post("/multipart/complete", response_model=UploadResponse)
async def complete_multipart_upload(
    request: CompleteMultipartUploadRequest,
    s3_service: S3Service = Depends(get_s3_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Complete a multipart upload."""
    try:
        parts = [
            {'PartNumber': part.part_number, 'ETag': part.etag}
            for part in request.parts
        ]
        
        result = await s3_service.complete_multipart_upload(
            request.key,
            request.upload_id,
            parts
        )
        
        audit_log(
            user_id=current_user["id"],
            action="complete_multipart_upload",
            resource=f"s3://{request.key}",
            status="success"
        )
        
        return UploadResponse(**result)
        
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Complete multipart upload error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete multipart upload"
        )

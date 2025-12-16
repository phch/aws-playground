from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
import logging

from app.models.schemas import (
    TemporaryCredentialsRequest,
    AwsCredentials,
    IamAccessKey,
    MessageResponse,
    UpdateAccessKeyStatusRequest,
    RotateAccessKeyRequest,
)
from app.credentials.service import CredentialService
from utils.security import get_current_user
from utils.logging import audit_log

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/credentials", tags=["Credentials"])


def get_credential_service(current_user: Dict[str, Any] = Depends(get_current_user)) -> CredentialService:
    """Dependency to create CredentialService instance for current user."""
    return CredentialService(user_id=current_user["id"])


@router.post("/temporary", response_model=AwsCredentials)
async def get_temporary_credentials(
    request: TemporaryCredentialsRequest,
    service: CredentialService = Depends(get_credential_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Generate temporary STS credentials."""
    try:
        credentials = await service.get_temporary_credentials(request.duration_seconds)
        
        audit_log(
            user_id=current_user["id"],
            action="generate_sts_credentials",
            resource="sts",
            status="success",
            details={"duration": request.duration_seconds}
        )
        
        return AwsCredentials(**credentials)
        
    except Exception as e:
        logger.error(f"Get temporary credentials error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate temporary credentials"
        )


@router.post("/access-key", response_model=IamAccessKey)
async def create_access_key(
    service: CredentialService = Depends(get_credential_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new IAM access key."""
    try:
        access_key = await service.create_access_key()
        
        audit_log(
            user_id=current_user["id"],
            action="create_access_key",
            resource="iam",
            status="success"
        )
        
        return IamAccessKey(**access_key)
        
    except Exception as e:
        logger.error(f"Create access key error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create access key"
        )


@router.get("/access-keys", response_model=List[IamAccessKey])
async def list_access_keys(
    service: CredentialService = Depends(get_credential_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all IAM access keys for the user."""
    try:
        keys = await service.list_access_keys()
        return [IamAccessKey(**key) for key in keys]
        
    except Exception as e:
        logger.error(f"List access keys error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list access keys"
        )


@router.delete("/access-key/{access_key_id}", response_model=MessageResponse)
async def delete_access_key(
    access_key_id: str,
    service: CredentialService = Depends(get_credential_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete an IAM access key."""
    try:
        await service.delete_access_key(access_key_id)
        
        audit_log(
            user_id=current_user["id"],
            action="delete_access_key",
            resource="iam",
            status="success",
            details={"access_key_id": access_key_id}
        )
        
        return MessageResponse(message="Access key deleted successfully")
        
    except Exception as e:
        logger.error(f"Delete access key error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete access key"
        )


@router.put("/access-key/{access_key_id}/status", response_model=MessageResponse)
async def update_access_key_status(
    access_key_id: str,
    request: UpdateAccessKeyStatusRequest,
    service: CredentialService = Depends(get_credential_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update the status of an IAM access key."""
    try:
        await service.update_access_key_status(access_key_id, request.status)
        
        audit_log(
            user_id=current_user["id"],
            action="update_access_key_status",
            resource="iam",
            status="success",
            details={"access_key_id": access_key_id, "new_status": request.status}
        )
        
        return MessageResponse(message=f"Access key status updated to {request.status}")
        
    except Exception as e:
        logger.error(f"Update access key status error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update access key status"
        )


@router.post("/access-key/rotate", response_model=IamAccessKey)
async def rotate_access_key(
    request: RotateAccessKeyRequest,
    service: CredentialService = Depends(get_credential_service),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Rotate an IAM access key by creating a new one and deleting the old one."""
    try:
        # Create new key
        new_key = await service.create_access_key()
        
        # Delete old key
        try:
            await service.delete_access_key(request.old_access_key_id)
        except Exception as e:
            logger.warning(f"Failed to delete old key during rotation: {str(e)}")
        
        audit_log(
            user_id=current_user["id"],
            action="rotate_access_key",
            resource="iam",
            status="success",
            details={"old_key": request.old_access_key_id}
        )
        
        return IamAccessKey(**new_key)
        
    except Exception as e:
        logger.error(f"Rotate access key error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to rotate access key"
        )

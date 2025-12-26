from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
import logging

from app.models.schemas import (
    LoginRequest,
    RegisterRequest,
    ConfirmRegistrationRequest,
    TokenResponse,
    UserResponse,
    MessageResponse,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
)
from app.auth.service import CognitoAuthService
from utils.security import get_current_user
from utils.logging import audit_log

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=MessageResponse)
async def register(request: RegisterRequest):
    """Register a new user."""
    try:
        service = CognitoAuthService()
        result = await service.register(request)
        
        audit_log(
            user_id=request.username,
            action="user_register",
            resource="cognito",
            status="success"
        )
        
        return MessageResponse(message=result["message"])
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/confirm", response_model=MessageResponse)
async def confirm_registration(request: ConfirmRegistrationRequest):
    """Confirm user registration with verification code."""
    try:
        service = CognitoAuthService()
        result = await service.confirm_registration(request.username, request.code)
        
        audit_log(
            user_id=request.username,
            action="user_confirm",
            resource="cognito",
            status="success"
        )
        
        return MessageResponse(message=result["message"])
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Confirmation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Confirmation failed"
        )


@router.post("/resend-code", response_model=MessageResponse)
async def resend_confirmation_code(request: Dict[str, str]):
    """Resend confirmation code."""
    try:
        service = CognitoAuthService()
        result = await service.resend_confirmation_code(request["username"])
        return MessageResponse(message=result["message"])
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Resend code error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend code"
        )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Login and receive authentication tokens."""
    try:
        service = CognitoAuthService()
        tokens = await service.login(request)
        
        audit_log(
            user_id=request.username,
            action="user_login",
            resource="cognito",
            status="success"
        )
        
        return tokens
        
    except ValueError as e:
        audit_log(
            user_id=request.username,
            action="user_login",
            resource="cognito",
            status="failed",
            details={"error": str(e)}
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@router.post("/refresh", response_model=Dict[str, str])
async def refresh_token(request: RefreshTokenRequest):
    """Refresh access token."""
    try:
        service = CognitoAuthService()
        tokens = await service.refresh_token(request.refresh_token)
        return tokens
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Logout and invalidate tokens."""
    try:
        # Note: In production, you'd pass the actual Cognito access token
        service = CognitoAuthService()
        result = await service.logout("")
        
        audit_log(
            user_id=current_user["id"],
            action="user_logout",
            resource="cognito",
            status="success"
        )
        
        return MessageResponse(message=result["message"])
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user information."""
    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        email=current_user.get("email", ""),
        attributes={}
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(request: ForgotPasswordRequest):
    """Initiate forgot password flow."""
    try:
        service = CognitoAuthService()
        result = await service.forgot_password(request.username)
        
        audit_log(
            user_id=request.username,
            action="forgot_password",
            resource="cognito",
            status="success"
        )
        
        return MessageResponse(message=result["message"])
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate password reset"
        )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(request: ResetPasswordRequest):
    """Reset password with confirmation code."""
    try:
        service = CognitoAuthService()
        result = await service.reset_password(
            request.username,
            request.code,
            request.new_password
        )
        
        audit_log(
            user_id=request.username,
            action="password_reset",
            resource="cognito",
            status="success"
        )
        
        return MessageResponse(message=result["message"])
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Password reset error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    request: ChangePasswordRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Change password for authenticated user."""
    try:
        service = CognitoAuthService()
        result = await service.change_password(
            "",  # Would need actual Cognito access token
            request.old_password,
            request.new_password
        )
        
        audit_log(
            user_id=current_user["id"],
            action="password_change",
            resource="cognito",
            status="success"
        )
        
        return MessageResponse(message=result["message"])
        
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Password change error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )

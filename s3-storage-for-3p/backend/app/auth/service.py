import boto3
from botocore.exceptions import ClientError
from typing import Dict, Any
from datetime import datetime, timedelta
import logging

from config import settings
from utils.security import create_access_token
from app.models.schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

logger = logging.getLogger(__name__)


class CognitoAuthService:
    """Service for handling AWS Cognito authentication."""
    
    def __init__(self):
        self.client = boto3.client('cognito-idp', region_name=settings.aws_region)
        self.user_pool_id = settings.cognito_user_pool_id
        self.client_id = settings.cognito_client_id
    
    async def register(self, request: RegisterRequest) -> Dict[str, Any]:
        """Register a new user with Cognito."""
        try:
            response = self.client.sign_up(
                ClientId=self.client_id,
                Username=request.username,
                Password=request.password,
                UserAttributes=[
                    {'Name': 'email', 'Value': request.email}
                ]
            )
            
            logger.info(f"User registered successfully: {request.username}")
            
            return {
                "message": "User registered successfully. Please check your email for verification code.",
                "user_sub": response['UserSub']
            }
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            
            logger.error(f"Registration failed for {request.username}: {error_message}")
            
            if error_code == 'UsernameExistsException':
                raise ValueError("Username already exists")
            elif error_code == 'InvalidPasswordException':
                raise ValueError("Password does not meet requirements")
            elif error_code == 'InvalidParameterException':
                raise ValueError(error_message)
            else:
                raise ValueError(f"Registration failed: {error_message}")
    
    async def confirm_registration(self, username: str, code: str) -> Dict[str, Any]:
        """Confirm user registration with verification code."""
        try:
            self.client.confirm_sign_up(
                ClientId=self.client_id,
                Username=username,
                ConfirmationCode=code
            )
            
            logger.info(f"User confirmed successfully: {username}")
            
            return {"message": "Email verified successfully"}
            
        except ClientError as e:
            error_message = e.response['Error']['Message']
            logger.error(f"Confirmation failed for {username}: {error_message}")
            raise ValueError(f"Confirmation failed: {error_message}")
    
    async def resend_confirmation_code(self, username: str) -> Dict[str, Any]:
        """Resend confirmation code to user."""
        try:
            self.client.resend_confirmation_code(
                ClientId=self.client_id,
                Username=username
            )
            
            return {"message": "Confirmation code sent"}
            
        except ClientError as e:
            error_message = e.response['Error']['Message']
            logger.error(f"Resend code failed for {username}: {error_message}")
            raise ValueError(f"Failed to resend code: {error_message}")
    
    async def login(self, request: LoginRequest) -> TokenResponse:
        """Authenticate user and return tokens."""
        try:
            response = self.client.initiate_auth(
                ClientId=self.client_id,
                AuthFlow='USER_PASSWORD_AUTH',
                AuthParameters={
                    'USERNAME': request.username,
                    'PASSWORD': request.password
                }
            )
            
            auth_result = response['AuthenticationResult']
            
            # Get user attributes
            user_response = self.client.get_user(
                AccessToken=auth_result['AccessToken']
            )
            
            # Extract user info
            user_sub = None
            email = None
            for attr in user_response['UserAttributes']:
                if attr['Name'] == 'sub':
                    user_sub = attr['Value']
                elif attr['Name'] == 'email':
                    email = attr['Value']
            
            # Create custom JWT with user info
            token_data = {
                "sub": user_sub,
                "username": request.username,
                "email": email,
                "cognito_sub": user_sub
            }
            
            access_token = create_access_token(token_data)
            
            logger.info(f"User logged in successfully: {request.username}")
            
            return TokenResponse(
                access_token=access_token,
                id_token=auth_result['IdToken'],
                refresh_token=auth_result['RefreshToken'],
                expires_in=auth_result['ExpiresIn']
            )
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            
            logger.error(f"Login failed for {request.username}: {error_message}")
            
            if error_code == 'NotAuthorizedException':
                raise ValueError("Incorrect username or password")
            elif error_code == 'UserNotConfirmedException':
                raise ValueError("User email not verified")
            else:
                raise ValueError(f"Login failed: {error_message}")
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, str]:
        """Refresh access token using refresh token."""
        try:
            response = self.client.initiate_auth(
                ClientId=self.client_id,
                AuthFlow='REFRESH_TOKEN_AUTH',
                AuthParameters={
                    'REFRESH_TOKEN': refresh_token
                }
            )
            
            auth_result = response['AuthenticationResult']
            
            return {
                "access_token": auth_result['AccessToken'],
                "id_token": auth_result['IdToken']
            }
            
        except ClientError as e:
            error_message = e.response['Error']['Message']
            logger.error(f"Token refresh failed: {error_message}")
            raise ValueError("Invalid refresh token")
    
    async def logout(self, access_token: str) -> Dict[str, Any]:
        """Logout user and invalidate token."""
        try:
            self.client.global_sign_out(
                AccessToken=access_token
            )
            
            return {"message": "Logged out successfully"}
            
        except ClientError as e:
            error_message = e.response['Error']['Message']
            logger.error(f"Logout failed: {error_message}")
            # Don't raise error on logout failure
            return {"message": "Logged out"}
    
    async def get_user_info(self, access_token: str) -> UserResponse:
        """Get user information from Cognito."""
        try:
            response = self.client.get_user(
                AccessToken=access_token
            )
            
            user_attributes = {}
            user_sub = None
            email = None
            
            for attr in response['UserAttributes']:
                user_attributes[attr['Name']] = attr['Value']
                if attr['Name'] == 'sub':
                    user_sub = attr['Value']
                elif attr['Name'] == 'email':
                    email = attr['Value']
            
            return UserResponse(
                id=user_sub,
                username=response['Username'],
                email=email,
                attributes=user_attributes
            )
            
        except ClientError as e:
            error_message = e.response['Error']['Message']
            logger.error(f"Get user info failed: {error_message}")
            raise ValueError("Failed to get user information")
    
    async def forgot_password(self, username: str) -> Dict[str, Any]:
        """Initiate forgot password flow."""
        try:
            self.client.forgot_password(
                ClientId=self.client_id,
                Username=username
            )
            
            return {"message": "Password reset code sent to your email"}
            
        except ClientError as e:
            error_message = e.response['Error']['Message']
            logger.error(f"Forgot password failed for {username}: {error_message}")
            raise ValueError(f"Failed to initiate password reset: {error_message}")
    
    async def reset_password(self, username: str, code: str, new_password: str) -> Dict[str, Any]:
        """Reset password with confirmation code."""
        try:
            self.client.confirm_forgot_password(
                ClientId=self.client_id,
                Username=username,
                ConfirmationCode=code,
                Password=new_password
            )
            
            logger.info(f"Password reset successfully for: {username}")
            
            return {"message": "Password reset successfully"}
            
        except ClientError as e:
            error_message = e.response['Error']['Message']
            logger.error(f"Password reset failed for {username}: {error_message}")
            raise ValueError(f"Failed to reset password: {error_message}")
    
    async def change_password(self, access_token: str, old_password: str, new_password: str) -> Dict[str, Any]:
        """Change password for authenticated user."""
        try:
            self.client.change_password(
                AccessToken=access_token,
                PreviousPassword=old_password,
                ProposedPassword=new_password
            )
            
            return {"message": "Password changed successfully"}
            
        except ClientError as e:
            error_message = e.response['Error']['Message']
            logger.error(f"Password change failed: {error_message}")
            raise ValueError(f"Failed to change password: {error_message}")

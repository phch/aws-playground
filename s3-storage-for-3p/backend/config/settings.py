from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # AWS Configuration
    aws_region: str = os.getenv("AWS_REGION", "us-east-1")
    cognito_user_pool_id: str = os.getenv("COGNITO_USER_POOL_ID", "")
    cognito_client_id: str = os.getenv("COGNITO_CLIENT_ID", "")
    s3_bucket_name: str = os.getenv("S3_BUCKET_NAME", "")

    # JWT Configuration
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change-this-in-production")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

    # CORS Configuration
    cors_origins: List[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000"
    ).split(",")

    # Application Configuration
    environment: str = os.getenv("ENVIRONMENT", "development")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    # Rate Limiting
    rate_limit_per_minute: int = 60

    # S3 Configuration
    max_upload_size: int = 100 * 1024 * 1024  # 100 MB
    presigned_url_expiration: int = 3600  # 1 hour

    # STS Configuration
    sts_min_duration: int = 900  # 15 minutes
    sts_max_duration: int = 43200  # 12 hours
    sts_default_duration: int = 3600  # 1 hour

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

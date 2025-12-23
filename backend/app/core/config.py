"""
Application configuration using Pydantic Settings.
Loads environment variables from .env file with validation.
"""

import sys
from functools import lru_cache
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Application
    app_name: str = "ByteWorks Dashboard"
    debug: bool = False
    api_prefix: str = "/api"
    public_api_url: str = "http://localhost:8000"
    
    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost/byteworks"
    
    # JWT Authentication
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    
    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:8000,http://127.0.0.1:3000,https://portal.byteworksagency.com,https://byteworksagency.com,https://www.byteworksagency.com"
    
    # Google Drive
    google_drive_enabled: bool = False
    google_drive_folder_id: str = ""
    
    # Integrations
    make_webhook_url: str = ""
    
    # Notion Integration
    notion_token: str = ""
    notion_leads_db_id: str = ""
    notion_clients_db_id: str = ""
    notion_quotes_db_id: str = ""
    notion_invoices_db_id: str = ""
    notion_payments_db_id: str = ""
    
    # Gmail SMTP (for notifications)
    gmail_address: str = ""
    gmail_app_password: str = ""
    notification_email: str = ""
    
    # Notification Channel
    notification_channel: str = "email"
    
    # Rate Limiting - per endpoint type
    rate_limit_default: str = "100/minute"
    rate_limit_public: str = "10/minute"
    rate_limit_auth: str = "5/minute"
    rate_limit_admin: str = "200/minute"
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    @field_validator('database_url')
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Warn if database URL appears to be default."""
        if 'password@localhost' in v and 'VERCEL' not in str(sys.argv):
            print("⚠️  WARNING: Using default DATABASE_URL. Set in .env for production.")
        return v
    
    @field_validator('secret_key')
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Warn if using default secret key."""
        if v == "your-secret-key-change-in-production":
            print("⚠️  WARNING: Using default SECRET_KEY. Change in .env for production!")
        return v
    
    def log_config_status(self):
        """Log configuration status on startup."""
        from .logger import get_app_logger
        logger = get_app_logger()
        
        logger.info(f"PUBLIC_API_URL: {self.public_api_url}")
        logger.info(f"CORS Origins: {len(self.cors_origins)} configured")
        
        if self.notion_token:
            logger.info("Notion Integration: enabled")
        if self.gmail_address and self.gmail_app_password:
            logger.info(f"Gmail notifications: enabled → {self.notification_email}")
        if self.debug:
            logger.warning("DEBUG mode is ON - disable in production")


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


def validate_required_settings():
    """
    Validate that critical settings are configured.
    Call this on startup to fail fast if misconfigured.
    """
    s = get_settings()
    errors = []
    
    # In production, these must be set
    if 'password@localhost' in s.database_url:
        errors.append("DATABASE_URL not configured (using default)")
    
    if s.secret_key == "your-secret-key-change-in-production":
        errors.append("SECRET_KEY not configured (using default)")
    
    if errors and not s.debug:
        # Only fail in non-debug mode
        from .logger import get_app_logger
        logger = get_app_logger()
        for error in errors:
            logger.warning(error)
    
    return len(errors) == 0


# Global settings instance
settings = get_settings()

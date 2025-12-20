"""
Application configuration using Pydantic Settings.
Loads environment variables from .env file.
"""

from functools import lru_cache
from typing import List
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
    
    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost/byteworks"
    
    # JWT Authentication
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    
    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:8000,http://127.0.0.1:3000,https://portal.byteworksagency.com,https://byteworksagency.com,https://www.byteworksagency.com"
    
    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        origins = [origin.strip() for origin in self.allowed_origins.split(",")]
        print(f"✅ Loaded CORS Origins from .env: {origins}")
        return origins
    
    # Google Drive
    google_drive_enabled: bool = False
    google_drive_folder_id: str = ""
    
    # Integrations
    make_webhook_url: str = ""
    
    # Discord Webhooks
    discord_leads_webhook: str = ""
    discord_quotes_webhook: str = ""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if self.discord_leads_webhook:
            print(f"✅ Discord Leads Webhook configured")
        if self.discord_quotes_webhook:
            print(f"✅ Discord Quotes Webhook configured")


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()

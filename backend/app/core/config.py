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
    public_api_url: str = "http://localhost:8000"  # Override in production!
    
    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost/byteworks"
    
    # JWT Authentication
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    
    # CORS
    allowed_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:8000,http://127.0.0.1:3000,https://portal.byteworksagency.com,https://byteworksagency.com,https://www.byteworksagency.com"
    
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
    notification_email: str = ""  # Email to receive notifications
    
    # Notification Channel: "email" or "whatsapp" (future)
    notification_channel: str = "email"
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Notion
        if self.notion_token:
            print(f"✅ Notion Integration configured")
        if self.notion_leads_db_id:
            print(f"✅ Notion databases configured")
        # Gmail
        if self.gmail_address and self.gmail_app_password:
            print(f"✅ Gmail notifications configured → {self.notification_email}")


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()

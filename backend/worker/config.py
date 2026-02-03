"""Worker service configuration."""

import os
from pydantic_settings import BaseSettings


class WorkerSettings(BaseSettings):
    """Worker-specific settings."""

    # Auto-sync settings
    auto_sync_enabled: bool = False
    sync_hour: int = 6  # Daily sync at 6 AM
    timezone: str = "UTC"

    # Database (inherited from main app)
    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@postgres:5432/training_optimizer"
    )

    # Garmin credentials
    garmin_email: str = ""
    garmin_password: str = ""
    garmin_token_path: str = "/app/data/.garmin_tokens"

    # Backend URL for notifications
    backend_url: str = "http://backend:8000"

    class Config:
        env_prefix = ""
        case_sensitive = False


# Global settings instance
settings = WorkerSettings()

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://training_optimizer:training_optimizer_password@localhost:5432/training_optimizer"
    garmin_email: str = ""
    garmin_password: str = ""
    garmin_token_path: str = "./.garmin_tokens"
    sync_schedule_enabled: bool = True
    sync_time: str = "06:00"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

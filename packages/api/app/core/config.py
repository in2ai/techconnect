"""Application settings."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly-typed runtime settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = Field(
        default="sqlite:///techconnect.db",
        validation_alias="DATABASE_URL",
    )
    api_prefix: str = "/api"
    cors_origins: tuple[str, ...] = ("http://localhost:5173", "http://localhost:3000")


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings object for the process lifetime."""
    return Settings()


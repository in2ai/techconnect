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
    auth_cookie_name: str = Field(default="techconnect_session", validation_alias="AUTH_COOKIE_NAME")
    auth_cookie_same_site: str = Field(default="lax", validation_alias="AUTH_COOKIE_SAME_SITE")
    auth_cookie_secure: bool = Field(default=False, validation_alias="AUTH_COOKIE_SECURE")
    auth_session_ttl_minutes: int = Field(default=720, validation_alias="AUTH_SESSION_TTL_MINUTES")
    auth_bootstrap_email: str | None = Field(default=None, validation_alias="AUTH_BOOTSTRAP_EMAIL")
    auth_bootstrap_password: str | None = Field(
        default=None,
        validation_alias="AUTH_BOOTSTRAP_PASSWORD",
    )
    auth_bootstrap_full_name: str = Field(
        default="TechConnect Administrator",
        validation_alias="AUTH_BOOTSTRAP_FULL_NAME",
    )
    auth_dev_bootstrap_email: str = "admin@techconnect.local"
    auth_dev_bootstrap_password: str = "techconnect-dev-password"
    auth_dev_bootstrap_full_name: str = "TechConnect Dev Administrator"

    @property
    def bootstrap_credentials(self) -> tuple[str, str, str] | None:
        """Return bootstrap credentials for supported environments."""
        if self.auth_bootstrap_email and self.auth_bootstrap_password:
            return (
                self.auth_bootstrap_email,
                self.auth_bootstrap_password,
                self.auth_bootstrap_full_name,
            )

        if self.database_url.startswith("sqlite"):
            return (
                self.auth_dev_bootstrap_email,
                self.auth_dev_bootstrap_password,
                self.auth_dev_bootstrap_full_name,
            )

        return None


@lru_cache
def get_settings() -> Settings:
    """Return a cached settings object for the process lifetime."""
    return Settings()


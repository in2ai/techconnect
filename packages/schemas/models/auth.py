"""Authentication-related persistence models."""

from datetime import UTC, datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel


def utc_now() -> datetime:
    """Return a naive UTC timestamp for database storage consistency."""
    return datetime.now(UTC).replace(tzinfo=None)


class AuthUser(SQLModel, table=True):
    """Application user account for local email/password authentication."""

    __tablename__ = "auth_user"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(index=True, unique=True, max_length=320)
    password_hash: str = Field(max_length=255)
    full_name: Optional[str] = Field(default=None, max_length=255)
    is_active: bool = Field(default=True)
    is_admin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utc_now)
    last_login_at: Optional[datetime] = Field(default=None)

    sessions: list["AuthSession"] = Relationship(back_populates="user")


class AuthSession(SQLModel, table=True):
    """Server-side browser session represented by a hashed cookie token."""

    __tablename__ = "auth_session"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="auth_user.id", index=True)
    token_hash: str = Field(index=True, unique=True, max_length=64)
    created_at: datetime = Field(default_factory=utc_now)
    expires_at: datetime

    user: Optional[AuthUser] = Relationship(back_populates="sessions")
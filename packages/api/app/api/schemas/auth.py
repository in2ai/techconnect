"""Authentication request and response schemas."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    """Credentials payload for local email/password login."""

    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)


class CurrentUserResponse(BaseModel):
    """Safe user details exposed to the frontend."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str | None
    is_admin: bool
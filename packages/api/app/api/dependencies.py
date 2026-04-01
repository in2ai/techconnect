"""Shared FastAPI dependencies."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from models import AuthUser
from sqlmodel import Session

from app.core.config import get_settings
from app.core.database import get_session
from app.services.auth import get_user_for_session_token

SessionDep = Annotated[Session, Depends(get_session)]


def require_authenticated_user(request: Request, session: SessionDep) -> AuthUser:
    """Resolve the currently-authenticated user from the session cookie."""
    settings = get_settings()
    session_token = request.cookies.get(settings.auth_cookie_name)
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    user = get_user_for_session_token(session, session_token)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    return user


CurrentUserDep = Annotated[AuthUser, Depends(require_authenticated_user)]


def require_admin_user(current_user: CurrentUserDep) -> AuthUser:
    """Ensure the authenticated user has administrator privileges."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required.",
        )
    return current_user


AdminUserDep = Annotated[AuthUser, Depends(require_admin_user)]

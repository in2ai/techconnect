"""Authentication and session-management services."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from sqlmodel import Session, select

from app.core.config import get_settings
from app.core.security import (
    generate_session_token,
    hash_password,
    hash_session_token,
    normalize_email,
    password_needs_rehash,
    utc_now,
    verify_password,
)
from models import AuthSession, AuthUser


@dataclass
class AuthenticatedSession:
    """Authenticated user and the freshly-issued session token."""

    user: AuthUser
    token: str


def ensure_bootstrap_user(session: Session) -> AuthUser | None:
    """Create the initial administrator account when bootstrap credentials are available."""
    settings = get_settings()
    credentials = settings.bootstrap_credentials
    if credentials is None:
        return None

    raw_email, password, full_name = credentials
    email = normalize_email(raw_email)
    existing = session.exec(select(AuthUser).where(AuthUser.email == email)).first()
    if existing is not None:
        if existing.is_admin and existing.is_active:
            return existing

        existing.is_admin = True
        existing.is_active = True
        if existing.full_name is None and full_name:
            existing.full_name = full_name
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    user = AuthUser(
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        is_active=True,
        is_admin=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def authenticate_user(session: Session, email: str, password: str) -> AuthenticatedSession | None:
    """Authenticate a user and create a new server-side session."""
    normalized_email = normalize_email(email)
    user = session.exec(select(AuthUser).where(AuthUser.email == normalized_email)).first()
    if user is None or not user.is_active:
        return None

    if not verify_password(password, user.password_hash):
        return None

    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)

    expires_at = utc_now() + timedelta(minutes=get_settings().auth_session_ttl_minutes)
    session_token = generate_session_token()
    auth_session = AuthSession(
        user_id=user.id,
        token_hash=hash_session_token(session_token),
        expires_at=expires_at,
    )

    user.last_login_at = utc_now()
    session.add(user)
    session.add(auth_session)
    session.commit()
    session.refresh(user)
    return AuthenticatedSession(user=user, token=session_token)


def get_user_for_session_token(session: Session, token: str) -> AuthUser | None:
    """Resolve the current user for a browser session token."""
    auth_session = session.exec(
        select(AuthSession).where(AuthSession.token_hash == hash_session_token(token)),
    ).first()
    if auth_session is None:
        return None

    if auth_session.expires_at <= utc_now():
        session.delete(auth_session)
        session.commit()
        return None

    user = session.get(AuthUser, auth_session.user_id)
    if user is None or not user.is_active:
        session.delete(auth_session)
        session.commit()
        return None

    return user


def revoke_session_token(session: Session, token: str) -> None:
    """Delete a server-side session if it exists."""
    auth_session = session.exec(
        select(AuthSession).where(AuthSession.token_hash == hash_session_token(token)),
    ).first()
    if auth_session is None:
        return

    session.delete(auth_session)
    session.commit()
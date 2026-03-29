"""Authentication endpoints."""

from datetime import timedelta

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.api.dependencies import CurrentUserDep, SessionDep
from app.api.schemas.auth import CurrentUserResponse, LoginRequest
from app.core.config import get_settings
from app.services.auth import authenticate_user, revoke_session_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _set_session_cookie(response: Response, token: str) -> None:
    """Attach the session cookie to the outgoing response."""
    settings = get_settings()
    max_age = int(timedelta(minutes=settings.auth_session_ttl_minutes).total_seconds())
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        samesite=settings.auth_cookie_same_site,
        secure=settings.auth_cookie_secure,
        max_age=max_age,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    """Remove the session cookie from the browser."""
    settings = get_settings()
    response.delete_cookie(
        key=settings.auth_cookie_name,
        httponly=True,
        samesite=settings.auth_cookie_same_site,
        secure=settings.auth_cookie_secure,
        path="/",
    )


@router.post(
    "/login",
    response_model=CurrentUserResponse,
    summary="Log in",
    description="Authenticate with email and password and start a browser session.",
)
def login(payload: LoginRequest, response: Response, session: SessionDep):
    """Create a browser session for a valid user."""
    authenticated = authenticate_user(session, payload.email, payload.password)
    if authenticated is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    _set_session_cookie(response, authenticated.token)
    return CurrentUserResponse.model_validate(authenticated.user)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Log out",
    description="Clear the current browser session.",
)
def logout(response: Response, request: Request, session: SessionDep) -> Response:
    """Revoke the current browser session if one exists."""
    settings = get_settings()
    session_token = request.cookies.get(settings.auth_cookie_name)
    if session_token:
        revoke_session_token(session, session_token)

    _clear_session_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get(
    "/me",
    response_model=CurrentUserResponse,
    summary="Current user",
    description="Return the authenticated user associated with the current browser session.",
)
def me(current_user: CurrentUserDep):
    """Return the authenticated user for the active session."""
    return CurrentUserResponse.model_validate(current_user)
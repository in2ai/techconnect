"""Authentication security helpers."""

from datetime import UTC, datetime
import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

_password_hasher = PasswordHasher()


def utc_now() -> datetime:
    """Return a naive UTC timestamp for database comparisons and storage."""
    return datetime.now(UTC).replace(tzinfo=None)


def normalize_email(email: str) -> str:
    """Normalize an email address for stable lookups and uniqueness."""
    return email.strip().casefold()


def hash_password(password: str) -> str:
    """Hash a plain-text password with Argon2id."""
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plain-text password against a stored Argon2 hash."""
    try:
        return _password_hasher.verify(password_hash, password)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    """Check whether a password hash should be upgraded."""
    return _password_hasher.check_needs_rehash(password_hash)


def generate_session_token() -> str:
    """Generate a random browser session token."""
    return secrets.token_urlsafe(48)


def hash_session_token(token: str) -> str:
    """Hash a browser session token before storing it in the database."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
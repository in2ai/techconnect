"""Database engine and session dependencies."""

import importlib
from collections.abc import Generator
from functools import lru_cache

from sqlmodel import SQLModel, Session, create_engine

from app.core.config import get_settings

# Import models for SQLModel metadata registration.
importlib.import_module("models")


@lru_cache
def get_engine():
    """Create a single shared engine for the process lifetime."""
    settings = get_settings()
    connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
    return create_engine(settings.database_url, connect_args=connect_args)


def create_db_and_tables() -> None:
    """Create all SQLModel tables."""
    SQLModel.metadata.create_all(get_engine())


def get_session() -> Generator[Session, None, None]:
    """Yield a per-request database session."""
    with Session(get_engine()) as session:
        yield session


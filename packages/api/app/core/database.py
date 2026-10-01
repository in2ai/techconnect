"""Database engine and session dependencies."""

import importlib
import sqlite3
from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import event
from sqlalchemy.pool import ConnectionPoolEntry
from sqlmodel import SQLModel, Session, create_engine

from app.core.config import get_settings

# Import models for SQLModel metadata registration.
importlib.import_module("models")


@lru_cache
def get_engine():
    """Create a single shared engine for the process lifetime."""
    settings = get_settings()
    connect_args = (
        {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
    )
    engine = create_engine(settings.database_url, connect_args=connect_args)
    if engine.dialect.name == "sqlite":

        @event.listens_for(engine, "connect")
        def enable_foreign_keys(
            connection: sqlite3.Connection, _record: ConnectionPoolEntry
        ) -> None:
            connection.execute("PRAGMA foreign_keys=ON").close()

    return engine


def create_db_and_tables() -> None:
    """Create all SQLModel tables."""
    SQLModel.metadata.create_all(get_engine())


def get_session() -> Generator[Session, None, None]:
    """Yield a per-request database session."""
    with Session(get_engine()) as session:
        yield session

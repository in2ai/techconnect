"""Backward-compatible database exports."""

from app.core.database import create_db_and_tables, get_engine, get_session

__all__ = ["create_db_and_tables", "get_engine", "get_session"]

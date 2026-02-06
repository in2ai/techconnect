"""
Database utilities for connecting to various databases and creating tables.

This module provides helper functions for initializing the database connection
and creating all tables defined in the models.

Environment Variables:
    DATABASE_URL: Database connection string
        - PostgreSQL: postgresql://user:password@host:port/database
        - MySQL: mysql+pymysql://user:password@host:port/database
        - SQLite: sqlite:///path/to/database.db
"""

import os
from typing import Generator, Optional

from sqlmodel import SQLModel, create_engine, Session

# Try to load .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, use system environment variables only

# Import all models to register them with SQLModel
from models import (
    Patient,
    Tumor,
    LiquidBiopsy,
    Biomodel,
    Passage,
    Trial,
    PDXTrial,
    PDOTrial,
    LCTrial,
    Implant,
    SizeRecord,
    Mouse,
    FACS,
    UsageRecord,
    Image,
    Cryopreservation,
    GenomicSequencing,
    MolecularData,
)

# Default fallback for development
DEFAULT_DATABASE_URL = "sqlite:///techconnect.db"


def get_database_url() -> str:
    """
    Get database URL from environment variable.
    
    Returns:
        Database connection URL from DATABASE_URL env var,
        or falls back to SQLite for development.
    """
    url = os.environ.get("DATABASE_URL")
    
    if not url:
        print("⚠️  DATABASE_URL not set, using SQLite fallback: techconnect.db")
        return DEFAULT_DATABASE_URL
    
    return url


def get_engine(database_url: Optional[str] = None, echo: bool = False):
    """
    Create a database engine.
    
    Args:
        database_url: Database connection URL (optional, reads from DATABASE_URL env var if not provided)
            - PostgreSQL: postgresql://user:password@host:port/database
            - MySQL: mysql+pymysql://user:password@host:port/database
            - SQLite: sqlite:///path/to/database.db
        echo: Whether to log SQL statements
        
    Returns:
        SQLAlchemy engine instance
    """
    url = database_url or get_database_url()
    return create_engine(url, echo=echo)


def create_db_and_tables(database_url: Optional[str] = None, echo: bool = False):
    """
    Create all database tables.
    
    Args:
        database_url: Database connection URL (optional, reads from DATABASE_URL env var if not provided)
        echo: Whether to log SQL statements
        
    Returns:
        SQLAlchemy engine instance
    """
    engine = get_engine(database_url, echo=echo)
    SQLModel.metadata.create_all(engine)
    return engine


def get_session(engine) -> Generator[Session, None, None]:
    """
    Get a database session (generator for dependency injection).
    
    Args:
        engine: SQLAlchemy engine instance
        
    Yields:
        Database session
    """
    with Session(engine) as session:
        yield session


if __name__ == "__main__":
    # Will use DATABASE_URL from environment, or fallback to SQLite
    engine = create_db_and_tables(echo=True)
    print("✅ Database tables created successfully!")

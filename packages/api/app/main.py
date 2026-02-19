"""TechConnect FastAPI backend application."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import create_db_and_tables


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Handle startup and shutdown events for shared resources."""
    create_db_and_tables()
    yield


def create_application() -> FastAPI:
    """Build and configure the FastAPI app instance."""
    settings = get_settings()

    app = FastAPI(
        title="TechConnect API",
        description="API for TechConnect biomedical research application",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/", summary="Root Endpoint", tags=["System"])
    def root():
        """Health check endpoint."""
        return {"status": "ok", "message": "TechConnect API is running"}

    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_application()

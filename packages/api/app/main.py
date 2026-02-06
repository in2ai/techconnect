"""
TechConnect FastAPI Backend

This module provides the main FastAPI application for the TechConnect
biomedical research application.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import models from the shared schemas package
from models import *  # noqa: F401, F403


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown events."""
    # Startup: Initialize database connection, etc.
    yield
    # Shutdown: Clean up resources


app = FastAPI(
    title="TechConnect API",
    description="API for TechConnect biomedical research application",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS for React Admin frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "TechConnect API is running"}


@app.get("/api/health")
async def health():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}

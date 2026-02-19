"""System health endpoints."""

from fastapi import APIRouter

router = APIRouter(tags=["System"])


@router.get("/health", summary="Health Check")
def health():
    """Health check endpoint for monitoring."""
    return {"status": "healthy"}


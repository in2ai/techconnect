"""API router composition."""

from fastapi import APIRouter

from app.api.endpoints.entities import router as entities_router
from app.api.endpoints.health import router as health_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(entities_router)

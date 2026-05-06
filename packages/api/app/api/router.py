"""API router composition."""

from fastapi import APIRouter, Depends

from app.api.dependencies import require_authenticated_user
from app.api.endpoints.auth import router as auth_router
from app.api.endpoints.entities import router as entities_router
from app.api.endpoints.health import router as health_router
from app.api.endpoints.imports import router as imports_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(entities_router, dependencies=[Depends(require_authenticated_user)])
api_router.include_router(imports_router, dependencies=[Depends(require_authenticated_user)])

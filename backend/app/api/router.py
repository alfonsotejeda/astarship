"""Root API router; feature modules register their own router here."""

from fastapi import APIRouter

from app.api.routes import health, user

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(user.router)

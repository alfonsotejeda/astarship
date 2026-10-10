"""Root API router; feature modules register their own router here."""

from fastapi import APIRouter

from app.api.routes import activity, health, user, category,  permission
api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(category.router)
api_router.include_router(user.router)
api_router.include_router(activity.router)
api_router.include_router(permission.router)

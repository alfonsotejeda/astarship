"""Root API router; feature modules register their own router here."""

from fastapi import APIRouter

from app.api.routes import activity, activity_type, category, health, package, permission, user

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(package.router)
api_router.include_router(category.router)
api_router.include_router(user.router)
api_router.include_router(activity.router)
api_router.include_router(activity_type.router)
api_router.include_router(permission.router)

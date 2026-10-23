"""Root API router; feature modules register their own router here."""

from fastapi import APIRouter

from app.api.routes import (
    activity,
    activity_type,
    category,
    health,
    itinerary,
    package,
    permission,
    proportion_category,
    travel_group,
    user,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(package.router)
api_router.include_router(category.router)
api_router.include_router(user.router)
api_router.include_router(activity.router)
api_router.include_router(activity_type.router)
api_router.include_router(permission.router)
api_router.include_router(travel_group.router)
api_router.include_router(itinerary.router)
api_router.include_router(proportion_category.router)

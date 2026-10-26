"""Root API router; feature modules register their own router here."""

from fastapi import APIRouter

from app.api.routes import (
    activity,
    activity_type,
    assignment,
    auth,
    authorization,
    category,
    health,
    itinerary,
    itinerary_composition,
    membership,
    package,
    proportion_type,
    travel_group,
    user,
)

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(package.router)
api_router.include_router(category.router)
api_router.include_router(user.router)
api_router.include_router(activity.router)
api_router.include_router(activity_type.router)
api_router.include_router(travel_group.router)
api_router.include_router(itinerary.router)
api_router.include_router(assignment.router)
api_router.include_router(proportion_type.router)
api_router.include_router(itinerary_composition.router)
api_router.include_router(membership.router)
api_router.include_router(authorization.router)

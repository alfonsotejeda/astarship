"""Root API router; feature modules register their own router here."""

from fastapi import APIRouter, Depends

from app.api.deps.auth import get_current_user
from app.api.routes import (
    activity,
    activity_type,
    assignment,
    attraction,
    auth,
    authorization,
    booking,
    category,
    coverage,
    health,
    itinerary,
    itinerary_approval,
    itinerary_composition,
    membership,
    modification_request,
    package,
    proportion_category,
    proportion_type,
    report,
    tourist,
    travel_group,
    itinerary_validation,
    user,
)

api_router = APIRouter()

# Public: health checks, login and sign-up
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(user.router)

authenticated = [Depends(get_current_user)]
api_router.include_router(package.router, dependencies=authenticated)
api_router.include_router(category.router, dependencies=authenticated)
api_router.include_router(activity.router, dependencies=authenticated)
api_router.include_router(activity_type.router, dependencies=authenticated)
api_router.include_router(travel_group.router, dependencies=authenticated)
api_router.include_router(itinerary.router, dependencies=authenticated)
api_router.include_router(booking.router, dependencies=authenticated)
api_router.include_router(tourist.router, dependencies=authenticated)
api_router.include_router(coverage.router, dependencies=authenticated)
api_router.include_router(assignment.router, dependencies=authenticated)
api_router.include_router(modification_request.router, dependencies=authenticated)
api_router.include_router(proportion_category.router, dependencies=authenticated)
api_router.include_router(proportion_type.router, dependencies=authenticated)
api_router.include_router(itinerary_composition.router, dependencies=authenticated)
api_router.include_router(membership.router, dependencies=authenticated)
api_router.include_router(authorization.router, dependencies=authenticated)
api_router.include_router(attraction.router, dependencies=authenticated)
api_router.include_router(itinerary_validation.router, dependencies=authenticated)
api_router.include_router(itinerary_approval.router, dependencies=authenticated)
api_router.include_router(report.router, dependencies=authenticated)

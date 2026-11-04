"""Itinerary routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_admin
from app.api.deps.authorization import check_guide_authorized
from app.api.deps.rules import get_approved_package, require_itinerary_author
from app.db.session import get_db
from app.models.activity import Activity
from app.models.status import ItineraryStatus, ReviewStatus
from app.models.user.user import User
from app.schemas.itinerary import (
    ItineraryGenerate,
    ItineraryGeneratedRead,
    ItineraryPlan,
    ItineraryRead,
    ItineraryUpdate,
)
from app.services import activity as activity_service
from app.services import activity_type as activity_type_service
from app.services import category as category_service
from app.services import itinerary as itinerary_service
from app.services import itinerary_generator as generator_service

router = APIRouter(prefix="/itineraries", tags=["itineraries"])


def _get_itinerary_or_404(db: Session, itinerary_id: int):
    """Return the itinerary or raise a 404."""
    itinerary = itinerary_service.get_itinerary(db, itinerary_id)
    if itinerary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found"
        )
    return itinerary


def _get_candidates(db: Session, candidate_ids: list[int]) -> list[Activity]:
    """Return the candidate activities, or raise a 404 if one is missing and a 409 if pending."""
    candidates = []
    for activity_id in candidate_ids:
        activity = activity_service.get_activity(db, activity_id)
        if activity is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")
        if activity.status is not ReviewStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Activity is not approved"
            )
        candidates.append(activity)
    return candidates


def _plan_itinerary(db: Session, user: User, data: ItineraryGenerate) -> ItineraryPlan:
    """Check RN-02, RN-09 and the requested records, then plan the itinerary."""
    get_approved_package(db, data.package_id)
    check_guide_authorized(db, user, data.package_id, can_generate=True)
    for proportion in data.proportion_types:
        if activity_type_service.get_activity_type(db, proportion.activity_type_code) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Activity type not found"
            )
    for proportion in data.proportion_categories:
        if category_service.category_by_id(db, proportion.category_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    candidates = _get_candidates(db, data.candidate_ids)
    try:
        return generator_service.plan_itinerary(candidates, data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc


@router.get("", response_model=list[ItineraryRead])
def list_itineraries(
    status: ItineraryStatus | None = None, db: Session = Depends(get_db)
) -> list[ItineraryRead]:
    """List all itineraries, optionally filtered by status."""
    return itinerary_service.list_itineraries(db, status)


@router.get("/{itinerary_id}", response_model=ItineraryRead)
def get_itinerary(itinerary_id: int, db: Session = Depends(get_db)) -> ItineraryRead:
    """Get a single itinerary by id."""
    return _get_itinerary_or_404(db, itinerary_id)


@router.post("/generate", response_model=ItineraryPlan)
def preview_itinerary(
    data: ItineraryGenerate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ItineraryPlan:
    """Generate an itinerary without saving it, so the guide can review it first."""
    return _plan_itinerary(db, user, data)


@router.post("", response_model=ItineraryGeneratedRead, status_code=status.HTTP_201_CREATED)
def create_itinerary(
    data: ItineraryGenerate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ItineraryGeneratedRead:
    """Generate an itinerary as the calling guide and save it as pending with its parameters."""
    plan = _plan_itinerary(db, user, data)
    itinerary = generator_service.save_itinerary(db, data, user.id, plan)
    return ItineraryGeneratedRead(
        **ItineraryRead.model_validate(itinerary).model_dump(), **plan.model_dump()
    )


@router.patch(
    "/{itinerary_id}",
    response_model=ItineraryRead,
    dependencies=[Depends(require_itinerary_author)],
)
def update_itinerary(
    itinerary_id: int, data: ItineraryUpdate, db: Session = Depends(get_db)
) -> ItineraryRead:
    """Update an existing itinerary."""
    itinerary = _get_itinerary_or_404(db, itinerary_id)
    return itinerary_service.update_itinerary(db, itinerary, data)


@router.delete(
    "/{itinerary_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)]
)
def delete_itinerary(itinerary_id: int, db: Session = Depends(get_db)) -> None:
    """Delete an itinerary."""
    itinerary = _get_itinerary_or_404(db, itinerary_id)
    itinerary_service.delete_itinerary(db, itinerary)

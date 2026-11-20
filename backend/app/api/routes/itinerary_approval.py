"""ItineraryApproval routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rules import forbid_acting_for_others
from app.db.session import get_db
from app.models.itinerary import Itinerary
from app.models.status import ItineraryStatus
from app.models.user.user import User
from app.schemas.itinerary_approval import ItineraryApprovalCreate, ItineraryApprovalRead
from app.services import itinerary as itinerary_service
from app.services import itinerary_approval as approval_service
from app.services import user as user_service

router = APIRouter(prefix="/itineraries/{itinerary_id}/approvals", tags=["itinerary approvals"])


def _get_itinerary_or_404(db: Session, itinerary_id: int) -> Itinerary:
    """Return the itinerary or raise a 404."""
    itinerary = itinerary_service.get_itinerary(db, itinerary_id)
    if itinerary is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Itinerary not found")
    return itinerary


@router.get("", response_model=list[ItineraryApprovalRead])
def list_approvals(itinerary_id: int, db: Session = Depends(get_db)) -> list[ItineraryApprovalRead]:
    """List the approvals of an itinerary, oldest first."""
    _get_itinerary_or_404(db, itinerary_id)
    return approval_service.list_approvals(db, itinerary_id)


@router.post("", response_model=ItineraryApprovalRead, status_code=status.HTTP_201_CREATED)
def create_approval(
    itinerary_id: int,
    data: ItineraryApprovalCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ItineraryApprovalRead:
    """Approve or reject a validated itinerary as an operations manager."""
    forbid_acting_for_others(user, data.manager_id)
    itinerary = _get_itinerary_or_404(db, itinerary_id)
    if user_service.get_operations_manager(db, data.manager_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Operations manager not found"
        )
    if itinerary.status is not ItineraryStatus.VALIDATED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only validated itineraries can be approved",
        )
    return approval_service.create_approval(db, itinerary, data)

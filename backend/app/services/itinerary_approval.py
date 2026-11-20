"""ItineraryApproval service."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.itinerary import Itinerary
from app.models.itinerary_approval import ItineraryApproval
from app.models.status import ApprovalResult, ItineraryStatus
from app.schemas.itinerary_approval import ItineraryApprovalCreate


def list_approvals(db: Session, itinerary_id: int) -> list[ItineraryApproval]:
    """Return the approvals of an itinerary, oldest first."""
    statement = (
        select(ItineraryApproval)
        .where(ItineraryApproval.itinerary_id == itinerary_id)
        .order_by(ItineraryApproval.approval_date)
    )
    return list(db.scalars(statement))


def create_approval(
    db: Session, itinerary: Itinerary, data: ItineraryApprovalCreate
) -> ItineraryApproval:
    """Record the manager's decision and move the itinerary to approved or rejected."""
    approval = ItineraryApproval(itinerary_id=itinerary.id, **data.model_dump())
    itinerary.status = (
        ItineraryStatus.APPROVED
        if data.result is ApprovalResult.APPROVED
        else ItineraryStatus.REJECTED
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)
    return approval

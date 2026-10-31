"""ModificationRequest service."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.membership import Membership
from app.models.modification_request import ModificationRequest
from app.models.travel_group import TravelGroup
from app.schemas.modification_request import ModificationRequestCreate, ModificationRequestUpdate


def list_modification_requests(
    db: Session, itinerary_id: int, tourist_id: int
) -> list[ModificationRequest]:
    """Return the modification requests of an assignment."""
    statement = select(ModificationRequest).where(
        ModificationRequest.itinerary_id == itinerary_id,
        ModificationRequest.tourist_id == tourist_id,
    )
    return list(db.scalars(statement))


def list_guide_modification_requests(db: Session, guide_id: int) -> list[ModificationRequest]:
    """Return the modification requests handled by a guide."""
    statement = select(ModificationRequest).where(ModificationRequest.guide_id == guide_id)
    return list(db.scalars(statement))


def get_modification_request(
    db: Session, itinerary_id: int, tourist_id: int, guide_id: int, request_date: datetime
) -> ModificationRequest | None:
    """Return a modification request by its key, or None if it doesn't exist."""
    return db.get(ModificationRequest, (itinerary_id, tourist_id, guide_id, request_date))


def default_guide_id(db: Session, tourist_id: int) -> int | None:
    """Return the guide attending the tourist's travel groups, or None if not exactly one."""
    statement = (
        select(TravelGroup.guide_id)
        .join(Membership, Membership.travel_group_id == TravelGroup.id)
        .where(Membership.tourist_id == tourist_id)
        .distinct()
    )
    guide_ids = list(db.scalars(statement))
    return guide_ids[0] if len(guide_ids) == 1 else None


def create_modification_request(
    db: Session,
    itinerary_id: int,
    tourist_id: int,
    guide_id: int,
    data: ModificationRequestCreate,
) -> ModificationRequest:
    """Record a modification request of an assignment, handled by the given guide."""
    modification_request = ModificationRequest(
        itinerary_id=itinerary_id,
        tourist_id=tourist_id,
        guide_id=guide_id,
        **data.model_dump(exclude={"guide_id"}, exclude_none=True),
    )
    db.add(modification_request)
    db.commit()
    db.refresh(modification_request)
    return modification_request


def update_modification_request(
    db: Session, modification_request: ModificationRequest, data: ModificationRequestUpdate
) -> ModificationRequest:
    """Apply partial updates to an existing modification request."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(modification_request, field, value)
    db.commit()
    db.refresh(modification_request)
    return modification_request


def delete_modification_request(db: Session, modification_request: ModificationRequest) -> None:
    """Delete a modification request."""
    db.delete(modification_request)
    db.commit()

"""Visit service: record and list the visits of an assigned itinerary."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assignment import Assignment
from app.models.itinerary_composition import ItineraryComposition
from app.models.status import VisitStatus
from app.models.visit import Visit
from app.schemas.visit import VisitCreated


def get_visit(db: Session, itinerary_id: int, tourist_id: int, activity_id: int) -> Visit | None:
    """Return a visit by its primary key, or None if it doesn't exist."""
    return db.get(Visit, (itinerary_id, tourist_id, activity_id))


def create_visit(db: Session, data: VisitCreated) -> Visit:
    """Register a visit of an activity included in an itinerary assigned to the tourist."""
    if db.get(Assignment, (data.itinerary_id, data.tourist_id)) is None:
        raise LookupError("Assignment not found")
    if db.get(ItineraryComposition, (data.itinerary_id, data.activity_id)) is None:
        raise LookupError("Itinerary composition not found")
    if get_visit(db, data.itinerary_id, data.tourist_id, data.activity_id) is not None:
        raise ValueError("Visit already registered")

    visit = Visit(**data.model_dump())
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


def list_visits(
    db: Session,
    itinerary_id: int | None = None,
    tourist_id: int | None = None,
    status: VisitStatus | None = None,
) -> list[Visit]:
    """List visits, optionally restricted by itinerary, tourist and outcome."""
    statement = select(Visit)
    if itinerary_id is not None:
        statement = statement.where(Visit.itinerary_id == itinerary_id)
    if tourist_id is not None:
        statement = statement.where(Visit.tourist_id == tourist_id)
    if status is not None:
        statement = statement.where(Visit.status == status)
    return list(
        db.scalars(statement.order_by(Visit.itinerary_id, Visit.tourist_id, Visit.activity_id))
    )

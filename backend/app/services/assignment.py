"""Assignment service."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assignment import Assignment
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate


def list_assignments(db: Session, itinerary_id: int) -> list[Assignment]:
    """Return the assignments of an itinerary."""
    statement = select(Assignment).where(Assignment.itinerary_id == itinerary_id)
    return list(db.scalars(statement))


def list_tourist_assignments(db: Session, tourist_id: int) -> list[Assignment]:
    """Return the assignments of a tourist."""
    statement = select(Assignment).where(Assignment.tourist_id == tourist_id)
    return list(db.scalars(statement))


def get_assignment(db: Session, itinerary_id: int, tourist_id: int) -> Assignment | None:
    """Return the assignment of an itinerary to a tourist, or None if it doesn't exist."""
    return db.get(Assignment, (itinerary_id, tourist_id))


def create_assignment(
    db: Session, itinerary_id: int, tourist_id: int, data: AssignmentCreate
) -> Assignment:
    """Assign an itinerary to a tourist."""
    assignment = Assignment(
        itinerary_id=itinerary_id,
        tourist_id=tourist_id,
        **data.model_dump(exclude_none=True),
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


def update_assignment(db: Session, assignment: Assignment, data: AssignmentUpdate) -> Assignment:
    """Apply partial updates to an existing assignment."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(assignment, field, value)
    db.commit()
    db.refresh(assignment)
    return assignment


def delete_assignment(db: Session, assignment: Assignment) -> None:
    """Remove an itinerary from a tourist."""
    db.delete(assignment)
    db.commit()

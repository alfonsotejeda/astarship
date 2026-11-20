"""Visit Service."""

from datetime import date

from sqlalchemy import and_, between, case, func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.assignment import Assignment
from app.models.itinerary import Itinerary
from app.models.itinerary_composition import ItineraryComposition
from app.models.user.tourist import Tourist
from app.models.visit import Visit
from app.schemas.visit import VisitCreated, VisitStatus, VisitUpdate


def _check_assignment(db: Session, itinerary_id: int, tourist_id: int, assignment_date: date):
    """Check that the assignment exists."""
    assignment = db.get(Assignment, (itinerary_id, tourist_id, assignment_date))
    if assignment is None:
        raise LookupError("Assignment not found")


def _check_itinerary_composition(db: Session, itinerary_id: int, activity_id: int):
    """Check taht the itinerary composition exists."""
    itinerary_composition = db.get(ItineraryComposition, (itinerary_id, activity_id))
    if itinerary_composition is None:
        raise LookupError("Itinerary Composition not found")


def _check_rating(status: str, rating: int | None):
    """Ensure a completed activity has a rating."""
    if status == "done" and rating is None:
        raise ValueError("A done visit needs a rating")


def create_visit(db: Session, data: VisitCreated) -> Visit:
    """Create a visit."""
    _check_assignment(db, data.itinerary_id, data.tourist_id, data.assignment_date)
    _check_itinerary_composition(db, data.itinerary_id, data.activity_id)

    if (
        db.get(Visit, (data.itinerary_id, data.tourist_id, data.assignment_date, data.activity_id))
        is not None
    ):
        raise ValueError("Visit already registered")  # -> Debemos de cambiar esto
    _check_rating(data.status, data.rating)

    visit = Visit(**data.model_dump())
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


def get_visit(
    db: Session, itinerary_id: int, tourist_id: int, assignment_date: date, activity_id: int
) -> Visit | None:
    """Get a visit by its id."""
    return db.get(Visit, (itinerary_id, tourist_id, assignment_date, activity_id))


def visit_by_assignment(
    db: Session, itinerary_id: int, tourist_id: int, assignment_date: date
) -> list[Visit]:
    """List a tourist's visits within an itinerary assignment."""
    _check_assignment(db, itinerary_id, tourist_id, assignment_date)
    stmt = (
        select(Visit)
        .where(
            Visit.tourist_id == tourist_id,
            Visit.itinerary_id == itinerary_id,
            Visit.assignment_date == assignment_date,
        )
        .order_by(Visit.activity_id)
    )
    return db.scalars(stmt).all()


def update_visit(
    db: Session, itinerary_id: int,
    tourist_id: int, assignment_date: date,
    activity_id: int, data: VisitUpdate
) -> Visit:
    """Apply a partial update to a visit, keeping the done-needs-rating rule."""
    visit = get_visit(db, itinerary_id, tourist_id, assignment_date, activity_id)
    if visit is None:
        raise LookupError("Visit not found")

    changes = data.model_dump(exclude_unset=True)
    status = changes.get("status", visit.status)
    rating = changes.get("rating", visit.rating)
    _check_rating(status, rating)

    for field, value in changes.items():
        setattr(visit, field, value)
    db.commit()
    db.refresh(visit)
    return visit


def delete_visit(
    db: Session, itinerary_id: int, tourist_id: int, assignment_date: date, activity_id: int
) -> None:
    """Delete a visit."""
    visit = get_visit(db, itinerary_id, tourist_id, assignment_date, activity_id)
    if visit is None:
        raise LookupError("Visit not found")
    db.delete(visit)
    db.commit()


def visit_by_activity(
    db: Session, activity_id: int, status: VisitStatus | None = None
) -> list[Visit]:
    """Activity's visits."""
    if db.get(Activity, activity_id) is None:
        raise LookupError("Activity not found")

    stmt = select(Visit).where(Visit.activity_id == activity_id)
    if status is not None:
        stmt = stmt.where(Visit.status == status)
    stmt = stmt.order_by(Visit.itinerary_id, Visit.tourist_id, Visit.assignment_date)
    return db.scalars(stmt).all()


def visit_by_tourist(
    db: Session, tourist_id: int, status: VisitStatus | None = None
) -> list[Visit]:
    """Tourist's visits."""
    if db.get(Tourist, tourist_id) is None:
        raise LookupError("Tourist not found.")
    stmt = select(Visit).where(Visit.tourist_id == tourist_id)
    if status is not None:
        stmt = stmt.where(Visit.status == status)
    stmt = stmt.order_by(Visit.itinerary_id, Visit.assignment_date, Visit.activity_id)
    return db.scalars(stmt).all()


def visits_by_itinerary(db: Session, itinerary_id: int, status: VisitStatus | None = None):
    """Itinerary's visits."""
    if db.get(Itinerary, itinerary_id) is None:
        raise LookupError("Itinerary not found")
    stmt = select(Visit).where(Visit.itinerary_id == itinerary_id)
    if status is not None:
        stmt = stmt.where(Visit.status == status)
    stmt = stmt.order_by(Visit.tourist_id, Visit.assignment_date, Visit.activity_id)
    return db.scalars(stmt).all()


def visit_between_dates(
    db: Session, first_assignment_date: date, second_assignment_date: date
) -> list[Visit]:
    """Return all visits between the specified dates."""
    if first_assignment_date > second_assignment_date:
        raise ValueError("The first date must be on or before the second date")
    stmt = select(Visit).where(
        between(Visit.assignment_date, first_assignment_date, second_assignment_date)
    ).order_by(Visit.assignment_date, Visit.itinerary_id, Visit.tourist_id, Visit.activity_id)
    return list(db.scalars(stmt).all())


def assignment_rating(
    db: Session, itinerary_id: int, tourist_id: int, assignment_date: date
) -> float | None:
    """Return the average rating for a tourist's completed visits in an itinerary."""
    _check_assignment(db, itinerary_id, tourist_id, assignment_date)
    stmt = select(func.avg(Visit.rating)).where(
        Visit.itinerary_id == itinerary_id,
        Visit.tourist_id == tourist_id,
        Visit.assignment_date == assignment_date,
        Visit.status == "done",
    )
    average = db.scalar(stmt)
    return None if average is None else round(float(average), 2)


def activity_satisfaction(db: Session, activity_id: int) -> tuple[float | None, int]:
    """Return the average rating of an activity and how many ratings it has.

    Only done visits count. The average is None when the activity has no ratings.
    """
    if db.get(Activity, activity_id) is None:
        raise LookupError("Activity not found")
    stmt = select(func.avg(Visit.rating), func.count(Visit.rating)).where(
        Visit.activity_id == activity_id, Visit.status == "done"
    )
    average, total = db.execute(stmt).one()
    rating = None if average is None else round(float(average), 2)
    return rating, total


def activity_visit_stats(db: Session) -> list[dict]:
    """Return visit totals, skipped rates, and ratings for each activity."""
    stmt = (
        select(
            Activity.id,
            Activity.name,
            func.count(Visit.activity_id).label("total_visits"),
            func.sum(case((Visit.status == "skipped", 1), else_=0)).label("skipped"),
            func.avg(case((Visit.status == "done", Visit.rating))).label("avg_rating"),
            func.count(case((Visit.status == "done", Visit.rating))).label("ratings"),
        )
        .outerjoin(Visit, Visit.activity_id == Activity.id)
        .group_by(Activity.id, Activity.name)
        .order_by(Activity.id)
    )

    stats = []
    for row in db.execute(stmt):
        abandonment_rate = (
            round(row.skipped * 100 / row.total_visits, 2) if row.total_visits else None
        )
        avg_rating = round(float(row.avg_rating), 2) if row.avg_rating is not None else None
        stats.append(
            {
                "activity_id": row.id,
                "activity_name": row.name,
                "total_visits": row.total_visits,
                "skipped": row.skipped,
                "abandonment_rate": abandonment_rate,
                "avg_rating": avg_rating,
                "ratings": row.ratings,
            }
        )
    return stats


def assignment_progress(db: Session, itinerary_id: int,
                        tourist_id: int, assignment_date: date) -> dict:
    """Return done and skipped visit counts and activity IDs with no visit."""
    _check_assignment(db, itinerary_id, tourist_id, assignment_date)

    stmt = (
        select(ItineraryComposition, Visit)
        .select_from(ItineraryComposition)
        .outerjoin(
            Visit,
            and_(
                Visit.itinerary_id == itinerary_id,
                Visit.activity_id == ItineraryComposition.activity_id,
                Visit.tourist_id == tourist_id,
                Visit.assignment_date == assignment_date,
            ),
        )
        .where(ItineraryComposition.itinerary_id == itinerary_id)
        .order_by(ItineraryComposition.activity_id)
    )
    done = 0
    skipped = 0
    pending = []
    rows = db.execute(stmt).all()

    for composition, visit in rows:
        if visit is not None:
            if visit.status == "done":
                done += 1

            elif visit.status == "skipped":
                skipped += 1

        else:
            pending.append(composition.activity_id)
    return {"done": done, "skipped": skipped, "pending_activity_ids": pending}

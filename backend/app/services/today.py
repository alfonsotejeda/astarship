"""Service for retrieving a tourist's itinerary for today."""

from datetime import date, timedelta

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.assignment import Assignment
from app.models.attraction import Attraction
from app.models.itinerary import Itinerary
from app.models.itinerary_composition import ItineraryComposition
from app.models.package import Package
from app.models.user.guide import Guide
from app.models.user.user import User
from app.models.visit import Visit


def get_today(db: Session, tourist_id: int, today: date | None = None) -> dict | None:
    """Return the active trip and its visit statuses, or None when no trip is active."""
    current_date = today or date.today()
    assignments = list(
        db.scalars(
            select(Assignment)
            .where(
                Assignment.tourist_id == tourist_id,
                Assignment.assignment_date <= current_date,
            )
            .order_by(Assignment.assignment_date.desc(), Assignment.itinerary_id.desc())
        )
    )
    if not assignments:
        return None

    itinerary_ids = {assignment.itinerary_id for assignment in assignments}
    durations = dict(
        db.execute(
            select(
                ItineraryComposition.itinerary_id,
                func.max(ItineraryComposition.day),
            )
            .where(ItineraryComposition.itinerary_id.in_(itinerary_ids))
            .group_by(ItineraryComposition.itinerary_id)
        ).all()
    )
    active_assignment = next(
        (
            assignment
            for assignment in assignments
            if (current_date - assignment.assignment_date).days + 1
            <= durations.get(assignment.itinerary_id, 0)
        ),
        None,
    )
    if active_assignment is None:
        return None

    itinerary = db.get(Itinerary, active_assignment.itinerary_id)
    package = db.get(Package, itinerary.package_id)
    guide = db.get(Guide, itinerary.guide_id)
    guide_user = db.get(User, guide.id)
    current_day = (current_date - active_assignment.assignment_date).days + 1
    total_days = durations[active_assignment.itinerary_id]

    rows = db.execute(
        select(ItineraryComposition, Activity, Attraction, Visit)
        .join(Activity, Activity.id == ItineraryComposition.activity_id)
        .outerjoin(Attraction, Attraction.id == Activity.attraction_id)
        .outerjoin(
            Visit,
            and_(
                Visit.itinerary_id == ItineraryComposition.itinerary_id,
                Visit.activity_id == ItineraryComposition.activity_id,
                Visit.tourist_id == tourist_id,
                Visit.assignment_date == active_assignment.assignment_date,
            ),
        )
        .where(ItineraryComposition.itinerary_id == active_assignment.itinerary_id)
        .order_by(ItineraryComposition.day, ItineraryComposition.order)
    ).all()

    days = [
        {
            "day": day_number,
            "date": active_assignment.assignment_date + timedelta(days=day_number - 1),
            "stops": [],
        }
        for day_number in range(1, total_days + 1)
    ]
    for composition, activity, attraction, visit in rows:
        days[composition.day - 1]["stops"].append(
            {
                "activity_id": activity.id,
                "order": composition.order,
                "start_time": composition.start_time,
                "activity_name": activity.name,
                "attraction_id": attraction.id if attraction else None,
                "attraction_name": attraction.name if attraction else None,
                "activity_type_code": activity.activity_type_code,
                "effort_level": activity.effort_level,
                "duration_minutes": activity.duration,
                "visit_status": visit.status if visit else None,
                "rating": visit.rating if visit else None,
                "travel": None,
            }
        )

    return {
        "itinerary_id": itinerary.id,
        "package_name": package.name,
        "guide": {"name": guide_user.name, "phone": None, "specialty": guide.specialty},
        "day": current_day,
        "days": days,
        "alternative": None,
    }
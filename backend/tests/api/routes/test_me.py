"""Tests for the authenticated tourist routes."""

from datetime import date, time, timedelta

from app.models.assignment import Assignment
from app.models.itinerary_composition import ItineraryComposition
from app.schemas.itinerary import ItineraryCreate
from app.services import itinerary as itinerary_service


def test_today_returns_active_trip_and_visit_status(
    client, as_user, db_session, visit_scenario
):
    """Return today's itinerary day and the tourist's visit status."""
    assignment_date = date.today() - timedelta(days=1)
    db_session.add(
        Assignment(
            itinerary_id=visit_scenario["itinerary_id"],
            tourist_id=visit_scenario["tourist_id"],
            assignment_date=assignment_date,
            admin_id=visit_scenario["admin_id"],
        )
    )
    second_day = db_session.get(
        ItineraryComposition,
        (visit_scenario["itinerary_id"], visit_scenario["activity_ids"][1]),
    )
    second_day.day = 2
    db_session.commit()

    visit_response = client.post(
        "/api/visits",
        json={
            "itinerary_id": visit_scenario["itinerary_id"],
            "tourist_id": visit_scenario["tourist_id"],
            "assignment_date": assignment_date.isoformat(),
            "activity_id": visit_scenario["activity_ids"][1],
            "status": "done",
            "rating": 4,
        },
    )
    assert visit_response.status_code == 201

    with as_user(visit_scenario["tourist_id"]):
        response = client.get("/api/me/today")

    assert response.status_code == 200
    body = response.json()
    assert body["itinerary_id"] == visit_scenario["itinerary_id"]
    assert body["package_name"] == "Andes"
    assert body["day"] == 2
    assert body["guide"] == {"name": "Gil", "phone": None, "specialty": "History"}
    assert body["days"][1]["date"] == date.today().isoformat()
    assert body["days"][1]["stops"][0]["visit_status"] == "done"
    assert body["days"][1]["stops"][0]["rating"] == 4
    assert body["alternative"] is None


def test_today_returns_null_when_tourist_has_no_active_trip(client, as_user, visit_scenario):
    """Return null when the authenticated tourist has no assignment today."""
    with as_user(visit_scenario["stranger_id"]):
        response = client.get("/api/me/today")

    assert response.status_code == 200
    assert response.json() is None


def test_today_rejects_non_tourist_user(client):
    """Reject users who do not have the tourist role."""
    response = client.get("/api/me/today")

    assert response.status_code == 403


def test_today_prefers_the_most_recent_overlapping_trip(
    client, as_user, db_session, visit_scenario, itinerary_owners
):
    """With two trips active today, the one that started last wins."""
    tourist_id = visit_scenario["tourist_id"]
    today = date.today()

    # Older trip: its third day falls on today.
    first_activity, second_activity = (
        db_session.get(
            ItineraryComposition,
            (visit_scenario["itinerary_id"], activity_id),
        )
        for activity_id in visit_scenario["activity_ids"]
    )
    first_activity.day = 1
    second_activity.day = 3
    db_session.add(
        Assignment(
            itinerary_id=visit_scenario["itinerary_id"],
            tourist_id=tourist_id,
            assignment_date=today - timedelta(days=2),
            admin_id=visit_scenario["admin_id"],
        )
    )

    # Newer trip: it starts today.
    recent_itinerary = itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(creation_date=today, activity_count=1, **itinerary_owners),
    )
    db_session.add(
        ItineraryComposition(
            itinerary_id=recent_itinerary.id,
            activity_id=visit_scenario["activity_ids"][0],
            order=1,
            day=1,
            start_time=time(9, 0),
        )
    )
    db_session.add(
        Assignment(
            itinerary_id=recent_itinerary.id,
            tourist_id=tourist_id,
            assignment_date=today,
            admin_id=visit_scenario["admin_id"],
        )
    )
    db_session.commit()

    with as_user(tourist_id):
        response = client.get("/api/me/today")

    assert response.status_code == 200
    body = response.json()
    assert body["itinerary_id"] == recent_itinerary.id
    assert body["day"] == 1
    assert body["days"][0]["date"] == today.isoformat()
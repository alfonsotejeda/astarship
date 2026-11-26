"""Tests for the report routes."""

from datetime import date, datetime

import pytest

from app.models.assignment import Assignment
from app.models.itinerary_composition import ItineraryComposition
from app.models.membership import Membership
from app.models.modification_request import ModificationRequest
from app.models.travel_group import TravelGroup
from app.models.visit import Visit
from app.schemas.itinerary import ItineraryCreate
from app.schemas.user import AdminCreate, TouristCreate
from app.services import itinerary as itinerary_service
from app.services import user as user_service


def test_rc1_returns_rows_and_chart(client, create_itinerary, itinerary_owners):
    itinerary_id = create_itinerary(activity_count=3)

    response = client.get("/api/reports/rc1")

    assert response.status_code == 200
    body = response.json()
    assert body["rows"] == [
        {
            "id": itinerary_id,
            "package_id": itinerary_owners["package_id"],
            "package_name": "Andes",
            "guide_id": itinerary_owners["guide_id"],
            "creator": "Gil",
            "creation_date": "2026-01-01",
            "status": "pending",
            "activity_count": 3,
            "proportion_types": [],
            "proportion_categories": [],
        }
    ]
    assert body["chart"] == [
        {
            "guide_id": itinerary_owners["guide_id"],
            "creator": "Gil",
            "status": "pending",
            "count": 1,
        }
    ]


def test_rc1_applies_package_and_date_filters(client, create_itinerary, itinerary_owners):
    create_itinerary()

    other_package = client.get(
        "/api/reports/rc1", params={"package_id": itinerary_owners["package_id"] + 1}
    )
    out_of_range = client.get("/api/reports/rc1", params={"date_from": "2026-02-01"})
    in_range = client.get(
        "/api/reports/rc1",
        params={
            "package_id": itinerary_owners["package_id"],
            "date_from": "2026-01-01",
            "date_to": "2026-01-31",
        },
    )

    assert other_package.json() == {"rows": [], "chart": []}
    assert out_of_range.json() == {"rows": [], "chart": []}
    assert len(in_range.json()["rows"]) == 1


def test_rc1_accepts_sort_column_and_order(client, create_itinerary):
    first = create_itinerary(activity_count=2)
    second = create_itinerary(activity_count=5)

    response = client.get("/api/reports/rc1", params={"sort": "activity_count", "order": "desc"})

    assert [row["id"] for row in response.json()["rows"]] == [second, first]


def test_rc1_rejects_unknown_sort_column(client):
    response = client.get("/api/reports/rc1", params={"sort": "password"})

    assert response.status_code == 422


def test_rc1_rejects_inverted_date_range(client):
    response = client.get(
        "/api/reports/rc1", params={"date_from": "2026-02-01", "date_to": "2026-01-01"}
    )

    assert response.status_code == 422


def _create_user(client, role, email, **fields) -> int:
    return client.post(
        "/api/users",
        json={"name": "Una", "role": role, "email": email, "password": "x", **fields},
    ).json()["id"]


def _create_package(client, name) -> int:
    admin_id = _create_user(client, "admin", f"{name}@example.com")
    return client.post(
        "/api/packages", json={"name": name, "destination": "Peru", "admin_id": admin_id}
    ).json()["id"]


def test_rc1_is_available_to_the_operations_manager(client, as_user, create_itinerary):
    create_itinerary()
    manager_id = _create_user(client, "operations_manager", "una@example.com")

    with as_user(manager_id):
        response = client.get("/api/reports/rc1")

    assert response.status_code == 200
    assert len(response.json()["rows"]) == 1


def test_rc1_is_forbidden_to_tourists(client, as_user, create_itinerary):
    create_itinerary()
    tourist_id = _create_user(client, "tourist", "ada@example.com", age=30)

    with as_user(tourist_id):
        response = client.get("/api/reports/rc1")

    assert response.status_code == 403


def test_rc1_shows_a_guide_every_package_regardless_of_authorization(
    client, as_user, db_session, create_itinerary, itinerary_owners
):
    create_itinerary()
    other_package_id = _create_package(client, "Alps")
    other_guide_id = _create_user(client, "guide", "ana@example.com", specialty="Nature")
    itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(
            creation_date=date(2026, 1, 1),
            activity_count=2,
            package_id=other_package_id,
            guide_id=other_guide_id,
        ),
    )

    with as_user(itinerary_owners["guide_id"]):
        response = client.get("/api/reports/rc1")

    assert response.status_code == 200
    assert {row["package_name"] for row in response.json()["rows"]} == {"Andes", "Alps"}


def test_rc1_requires_authentication(anonymous_client):
    response = anonymous_client.get("/api/reports/rc1")

    assert response.status_code == 401


@pytest.fixture
def rc6_api_data(db_session, itinerary_owners, insert_activity):
    """One itinerary with three tourists, one visit each and one modification request."""
    package_id, guide_id = itinerary_owners["package_id"], itinerary_owners["guide_id"]
    admin_id = user_service.create_user(
        db_session,
        AdminCreate(name="Chief", role="admin", email="chief@example.com", password="x"),
    ).id
    itinerary = itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(
            creation_date=date(2026, 1, 1),
            activity_count=1,
            package_id=package_id,
            guide_id=guide_id,
        ),
    )
    activity = insert_activity("Museum")
    db_session.add(
        ItineraryComposition(
            itinerary_id=itinerary.id,
            activity_id=activity.id,
            order=1,
            day=1,
            start_time=datetime(2026, 1, 1, 9).time(),
        )
    )
    tourists = [
        user_service.create_user(
            db_session,
            TouristCreate(
                name=name,
                role="tourist",
                email=f"api-{name.lower()}@example.com",
                password="x",
                age=30,
            ),
        )
        for name in ("Ada", "Bob", "Eve")
    ]
    assignment_date = date(2026, 3, 1)
    for tourist in tourists:
        db_session.add(
            Assignment(
                itinerary_id=itinerary.id,
                tourist_id=tourist.id,
                assignment_date=assignment_date,
                admin_id=admin_id,
            )
        )
        db_session.add(
            Visit(
                itinerary_id=itinerary.id,
                tourist_id=tourist.id,
                assignment_date=assignment_date,
                activity_id=activity.id,
                status="skipped" if tourist == tourists[2] else "done",
                rating=None if tourist == tourists[2] else 4 if tourist == tourists[0] else 2,
            )
        )
    group = TravelGroup(name="API Group", guide_id=guide_id)
    db_session.add(group)
    db_session.flush()
    for tourist in tourists:
        db_session.add(Membership(tourist_id=tourist.id, travel_group_id=group.id))
    db_session.add(
        ModificationRequest(
            itinerary_id=itinerary.id,
            tourist_id=tourists[0].id,
            assignment_date=assignment_date,
            guide_id=guide_id,
            request_date=datetime(2026, 3, 2, 10),
            description="Another route",
        )
    )
    db_session.commit()
    return {
        "package_id": package_id,
        "itinerary_id": itinerary.id,
        "tourist_id": tourists[0].id,
        "activity_id": activity.id,
        "assignment_date": assignment_date,
    }


def test_rc6_returns_charts_tables_and_trend(client, rc6_api_data):
    response = client.get("/api/reports/rc6")

    assert response.status_code == 200
    body = response.json()
    assert len(body["scatter"]) == 1
    assert body["scatter"][0]["effort"] == "alto"
    assert body["scatter"][0]["rating"] == 3.0
    assert body["package_chart"] == [
        {
            "package_id": rc6_api_data["package_id"],
            "package_name": "Andes",
            "bajo": None,
            "medio": None,
            "alto": 3.0,
        }
    ]
    assert body["effort_summary"][2]["visits"] == 3
    assert body["abandonment"] == [
        {
            "id": f"{rc6_api_data['activity_id']}-{rc6_api_data['package_id']}",
            "activity_id": rc6_api_data["activity_id"],
            "activity_name": "Museum",
            "effort": "alto",
            "package_id": rc6_api_data["package_id"],
            "package_name": "Andes",
            "guide_id": body["abandonment"][0]["guide_id"],
            "guide_name": "Hugo",
            "visits": 3,
            "completed": 2,
            "skipped": 1,
            "abandonment": pytest.approx(100 / 3),
            "rating": 3.0,
        }
    ]
    assert body["requesters"] == [
        {
            "id": f"{rc6_api_data['tourist_id']}-1-{rc6_api_data['package_id']}",
            "tourist_id": rc6_api_data["tourist_id"],
            "tourist_name": "Ada",
            "group_id": 1,
            "group_name": "API Group",
            "package_id": rc6_api_data["package_id"],
            "package_name": "Andes",
            "requests": 1,
            "visits": 1,
            "rated": 1,
            "rating": 4.0,
            "group_rating": 2.0,
            "difference": 2.0,
        }
    ]
    assert body["trend"] is None
    assert body["summary"]["visits"] == 3
    assert body["summary"]["requests"] == 1


def test_rc6_trend_uses_the_chart_aliases(client, db_session, rc6_api_data, insert_activity):
    activity = insert_activity("Walk")
    activity.effort_level = 1
    db_session.add(
        ItineraryComposition(
            itinerary_id=rc6_api_data["itinerary_id"],
            activity_id=activity.id,
            order=2,
            day=2,
            start_time=datetime(2026, 1, 1, 10).time(),
        )
    )
    db_session.add(
        Visit(
            itinerary_id=rc6_api_data["itinerary_id"],
            tourist_id=rc6_api_data["tourist_id"],
            assignment_date=rc6_api_data["assignment_date"],
            activity_id=activity.id,
            status="done",
            rating=5,
        )
    )
    db_session.commit()

    trend = client.get("/api/reports/rc6").json()["trend"]

    assert set(trend) == {"slope", "intercept", "correlation", "from", "to"}
    assert trend["from"][0] == 1 and trend["to"][0] == 3


def test_rc6_applies_package_and_date_filters(client, rc6_api_data):
    other = client.get("/api/reports/rc6", params={"package_id": rc6_api_data["package_id"] + 100})
    out_of_range = client.get("/api/reports/rc6", params={"date_to": "2026-03-01"})
    in_range = client.get(
        "/api/reports/rc6", params={"date_from": "2026-03-01", "date_to": "2026-03-02"}
    )

    assert other.json()["summary"]["visits"] == 0
    assert other.json()["requesters"] == []
    assert out_of_range.json()["summary"]["requests"] == 0
    assert in_range.json()["summary"]["visits"] == 3
    assert in_range.json()["summary"]["requests"] == 1


def test_rc6_rejects_inverted_date_range(client):
    response = client.get(
        "/api/reports/rc6", params={"date_from": "2026-03-02", "date_to": "2026-03-01"}
    )

    assert response.status_code == 422


def test_rc6_is_available_to_the_operations_manager(client, as_user, rc6_api_data):
    manager_id = _create_user(client, "operations_manager", "rc6-manager@example.com")

    with as_user(manager_id):
        response = client.get("/api/reports/rc6")

    assert response.status_code == 200
    assert response.json()["summary"]["visits"] == 3


def test_rc6_is_forbidden_to_tourists(client, as_user, rc6_api_data):
    tourist_id = _create_user(client, "tourist", "rc6-tourist@example.com", age=30)

    with as_user(tourist_id):
        response = client.get("/api/reports/rc6")

    assert response.status_code == 403


def test_rc6_requires_authentication(anonymous_client):
    response = anonymous_client.get("/api/reports/rc6")

    assert response.status_code == 401

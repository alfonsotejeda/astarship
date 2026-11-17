"""Tests for the report routes."""

from datetime import date

import pytest

from app.schemas.itinerary import ItineraryCreate
from app.services import itinerary as itinerary_service


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


def test_rc2_returns_rows_chart_and_summary(client, rc2_data):
    response = client.get("/api/reports/rc2")

    assert response.status_code == 200
    body = response.json()
    assert body["rows"] == [
        {
            "activity_id": rc2_data["peak_id"],
            "activity_name": "Peak",
            "category_id": rc2_data["hiking_category_id"],
            "category_name": "Hiking routes",
            "activity_type_code": "hike",
            "activity_type_name": "Hike",
            "effort": "alto",
            "uses": 3,
            "percentage": pytest.approx(3 / 7 * 100),
        },
        {
            "activity_id": rc2_data["forest_id"],
            "activity_name": "Forest",
            "category_id": rc2_data["hiking_category_id"],
            "category_name": "Hiking routes",
            "activity_type_code": "hike",
            "activity_type_name": "Hike",
            "effort": "medio",
            "uses": 2,
            "percentage": pytest.approx(2 / 7 * 100),
        },
        {
            "activity_id": rc2_data["river_id"],
            "activity_name": "River",
            "category_id": rc2_data["water_category_id"],
            "category_name": "Water",
            "activity_type_code": "boat",
            "activity_type_name": "Boat",
            "effort": "bajo",
            "uses": 2,
            "percentage": pytest.approx(2 / 7 * 100),
        },
    ]
    assert body["chart"] == [
        {
            "category_id": rc2_data["hiking_category_id"],
            "category": "Hiking routes",
            "bajo": 0,
            "medio": 2,
            "alto": 3,
        },
        {
            "category_id": rc2_data["water_category_id"],
            "category": "Water",
            "bajo": 2,
            "medio": 0,
            "alto": 0,
        },
    ]
    assert body["summary"] == {
        "final_itineraries": 4,
        "distinct_activities": 3,
        "total_uses": 7,
        "high_effort_uses": 3,
    }


def test_rc2_applies_package_and_date_filters(client, rc2_data):
    other_package = client.get("/api/reports/rc2", params={"package_id": rc2_data["alps_id"]})
    out_of_range = client.get("/api/reports/rc2", params={"date_from": "2026-04-01"})
    in_range = client.get(
        "/api/reports/rc2",
        params={
            "package_id": rc2_data["andes_id"],
            "date_from": "2026-02-01",
            "date_to": "2026-02-28",
        },
    )

    assert [row["activity_name"] for row in other_package.json()["rows"]] == ["River"]
    assert other_package.json()["summary"]["final_itineraries"] == 1
    assert out_of_range.json() == {
        "rows": [],
        "chart": [],
        "summary": {
            "final_itineraries": 0,
            "distinct_activities": 0,
            "total_uses": 0,
            "high_effort_uses": 0,
        },
    }
    assert [row["activity_name"] for row in in_range.json()["rows"]] == ["Peak", "River"]
    assert in_range.json()["summary"]["final_itineraries"] == 1


def test_rc2_accepts_sort_column_and_order(client, rc2_data):
    response = client.get("/api/reports/rc2", params={"sort": "effort", "order": "asc"})

    assert [row["activity_name"] for row in response.json()["rows"]] == [
        "River",
        "Forest",
        "Peak",
    ]


def test_rc2_rejects_unknown_sort_column(client):
    response = client.get("/api/reports/rc2", params={"sort": "password"})

    assert response.status_code == 422


def test_rc2_rejects_inverted_date_range(client):
    response = client.get(
        "/api/reports/rc2", params={"date_from": "2026-02-01", "date_to": "2026-01-01"}
    )

    assert response.status_code == 422


def test_rc2_is_available_to_the_operations_manager(client, as_user, rc2_data):
    manager_id = _create_user(client, "operations_manager", "rc2-manager@example.com")

    with as_user(manager_id):
        response = client.get("/api/reports/rc2")

    assert response.status_code == 200
    assert len(response.json()["rows"]) == 3


def test_rc2_is_forbidden_to_tourists(client, as_user, rc2_data):
    tourist_id = _create_user(client, "tourist", "rc2-tourist@example.com", age=30)

    with as_user(tourist_id):
        response = client.get("/api/reports/rc2")

    assert response.status_code == 403


def test_rc2_shows_a_guide_every_package(client, as_user, itinerary_owners, rc2_data):
    with as_user(itinerary_owners["guide_id"]):
        response = client.get("/api/reports/rc2")

    assert response.status_code == 200
    # The guide is only authorized for Andes, but the report counts the Alps itinerary too.
    assert response.json()["summary"]["final_itineraries"] == 4


def test_rc2_requires_authentication(anonymous_client):
    response = anonymous_client.get("/api/reports/rc2")

    assert response.status_code == 401

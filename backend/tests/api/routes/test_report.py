"""Tests for the report routes."""

from datetime import date

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


def test_rc5_returns_rows_charts_and_summary(client, rc5_data):
    response = client.get("/api/reports/rc5")

    assert response.status_code == 200
    body = response.json()
    assert [row["id"] for row in body["rows"]] == [
        rc5_data["itineraries"]["second"],
        rc5_data["itineraries"]["first"],
        rc5_data["itineraries"]["third"],
    ]
    assert body["rows"][1]["proportion"] == [33, 33, 34]
    assert body["rows"][1]["balanced"] is True
    assert [(point["package_name"], point["alto"]) for point in body["effort_chart"]] == [
        ("Alps", 1),
        ("Andes", 1),
    ]
    assert body["summary"] == {
        "itineraries": 3,
        "packages": 2,
        "activities": 6,
        "balanced": 1,
        "unbalanced": 2,
        "high_effort": 2,
    }


def test_rc5_applies_set_and_date_filters(client, rc5_data):
    assigned = client.get("/api/reports/rc5", params={"set": "assigned"}).json()
    status = client.get("/api/reports/rc5", params={"set": "approved"}).json()
    dates = client.get(
        "/api/reports/rc5", params={"date_from": "2026-02-01", "date_to": "2026-02-28"}
    ).json()

    assert [row["id"] for row in assigned["rows"]] == [rc5_data["itineraries"]["third"]]
    assert [row["id"] for row in status["rows"]] == [rc5_data["itineraries"]["first"]]
    assert [row["id"] for row in dates["rows"]] == [rc5_data["itineraries"]["second"]]


def test_rc5_accepts_sort_column_and_order(client, rc5_data):
    response = client.get("/api/reports/rc5", params={"sort": "criteria_met", "order": "desc"})

    assert response.status_code == 200
    assert [row["id"] for row in response.json()["rows"]] == [
        rc5_data["itineraries"]["first"],
        rc5_data["itineraries"]["third"],
        rc5_data["itineraries"]["second"],
    ]


def test_rc5_rejects_unknown_set_and_sort_column(client):
    assert client.get("/api/reports/rc5", params={"set": "everything"}).status_code == 422
    assert client.get("/api/reports/rc5", params={"sort": "password"}).status_code == 422


def test_rc5_rejects_inverted_date_range(client):
    response = client.get(
        "/api/reports/rc5", params={"date_from": "2026-03-01", "date_to": "2026-02-01"}
    )

    assert response.status_code == 422


def test_rc5_is_available_to_the_operations_manager(client, as_user, rc5_data):
    manager_id = _create_user(client, "operations_manager", "ops@example.com")

    with as_user(manager_id):
        response = client.get("/api/reports/rc5")

    assert response.status_code == 200
    assert len(response.json()["rows"]) == 3


def test_rc5_is_forbidden_to_tourists(client, as_user, rc5_data):
    tourist_id = _create_user(client, "tourist", "tourist@example.com", age=30)

    with as_user(tourist_id):
        response = client.get("/api/reports/rc5")

    assert response.status_code == 403


def test_rc5_requires_authentication(anonymous_client):
    response = anonymous_client.get("/api/reports/rc5")

    assert response.status_code == 401

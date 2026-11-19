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


def test_rc4_returns_rows_chart_summary_and_filter_options(client, rc4_data):
    response = client.get("/api/reports/rc4")

    assert response.status_code == 200
    body = response.json()
    assert [(row["id"], row["effort"], row["visits"]) for row in body["rows"]] == [
        (rc4_data["activities"]["Canyon"], "bajo", 3),
        (rc4_data["activities"]["Museum"], "medio", 3),
        (rc4_data["activities"]["Peak"], "alto", 2),
    ]
    assert [(point["effort"], point["label"]) for point in body["chart"]] == [
        ("bajo", "Bajo"),
        ("medio", "Medio"),
        ("alto", "Alto"),
    ]
    assert body["summary"] == {
        "visits": 8,
        "completed": 5,
        "skipped": 3,
        "rated": 5,
        "tourists": 3,
        "rating": 19 / 5,
        "satisfaction": 3 / 8 * 100,
        "abandonment": 3 / 8 * 100,
    }
    assert [item["id"] for item in body["itineraries"]] == rc4_data["itineraries"][::-1]
    assert [item["name"] for item in body["groups"]] == ["Alpha", "Beta"]


def test_rc4_applies_itinerary_and_group_filters(client, rc4_data):
    first = client.get(
        "/api/reports/rc4", params={"itinerary_id": rc4_data["itineraries"][0]}
    ).json()
    beta = client.get("/api/reports/rc4", params={"group_id": rc4_data["groups"]["beta"]}).json()
    both = client.get(
        "/api/reports/rc4",
        params={
            "itinerary_id": rc4_data["itineraries"][0],
            "group_id": rc4_data["groups"]["beta"],
        },
    ).json()

    assert [row["visits"] for row in first["rows"]] == [2, 2, 2]
    assert [row["visits"] for row in beta["rows"]] == [1, 1]
    assert both["rows"] == []


def test_rc4_accepts_sort_column_and_order(client, rc4_data):
    response = client.get("/api/reports/rc4", params={"sort": "abandonment", "order": "desc"})

    assert response.status_code == 200
    assert [row["id"] for row in response.json()["rows"]] == [
        rc4_data["activities"]["Museum"],
        rc4_data["activities"]["Peak"],
        rc4_data["activities"]["Canyon"],
    ]


def test_rc4_rejects_unknown_sort_column(client):
    response = client.get("/api/reports/rc4", params={"sort": "password"})

    assert response.status_code == 422


def test_rc4_is_available_to_the_operations_manager(client, as_user, rc4_data):
    manager_id = _create_user(client, "operations_manager", "ops@example.com")

    with as_user(manager_id):
        response = client.get("/api/reports/rc4")

    assert response.status_code == 200
    assert len(response.json()["rows"]) == 3


def test_rc4_is_forbidden_to_tourists(client, as_user, rc4_data):
    tourist_id = _create_user(client, "tourist", "tourist@example.com", age=30)

    with as_user(tourist_id):
        response = client.get("/api/reports/rc4")

    assert response.status_code == 403


def test_rc4_requires_authentication(anonymous_client):
    response = anonymous_client.get("/api/reports/rc4")

    assert response.status_code == 401

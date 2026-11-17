"""Tests for the booking routes."""

from datetime import date
from uuid import uuid4

from app.schemas.itinerary import ItineraryCreate
from app.services import itinerary as itinerary_service


def _create_tourist(client, email="ada@example.com"):
    return client.post(
        "/api/users",
        json={
            "name": "Ada",
            "role": "tourist",
            "email": email,
            "password": "s3cret",
            "age": 30,
        },
    ).json()


def _create_package(client, name="Europa Capitales", destination="París"):
    admin = client.post(
        "/api/users",
        json={
            "name": "Owner",
            "role": "admin",
            "email": f"{uuid4().hex}@example.com",
            "password": "s3cret",
        },
    ).json()
    return client.post(
        "/api/packages",
        json={"name": name, "destination": destination, "admin_id": admin["id"]},
    ).json()


def _create_booking(client, tourist_id, package_id, booking_date="2026-10-01", **extra):
    payload = {
        "tourist_id": tourist_id,
        "package_id": package_id,
        "booking_date": booking_date,
    }
    payload.update(extra)
    return client.post("/api/bookings", json=payload)


def test_create_booking_returns_201_and_pair(client):
    tourist = _create_tourist(client)
    package = _create_package(client)

    response = _create_booking(client, tourist["id"], package["id"])

    assert response.status_code == 201
    body = response.json()
    assert body == {
        "tourist_id": tourist["id"],
        "package_id": package["id"],
        "booking_date": "2026-10-01",
        "proposed_date": None,
        "itinerary_id": None,
        "rejection_reason": None,
        "status": "pending",
    }


def test_create_booking_with_optional_fields(client, db_session, itinerary_owners):
    tourist = _create_tourist(client)
    package = _create_package(client)
    itinerary = itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(
            creation_date=date(2026, 10, 1),
            activity_count=3,
            **itinerary_owners,
        ),
    )

    response = _create_booking(
        client,
        tourist["id"],
        package["id"],
        proposed_date="2026-11-01",
        itinerary_id=itinerary.id,
        status="rejected",
        rejection_reason="Sin cupos",
    )

    assert response.status_code == 201
    body = response.json()
    assert body["proposed_date"] == "2026-11-01"
    assert body["itinerary_id"] == itinerary.id
    assert body["rejection_reason"] == "Sin cupos"
    assert body["status"] == "rejected"


def test_update_booking_returns_200_and_modified_fields(client, db_session, itinerary_owners):
    tourist = _create_tourist(client)
    package = _create_package(client)
    itinerary = itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(
            creation_date=date(2026, 10, 1),
            activity_count=2,
            **itinerary_owners,
        ),
    )
    _create_booking(client, tourist["id"], package["id"])

    response = client.patch(
        f"/api/bookings/{tourist['id']}/{package['id']}",
        json={"status": "assigned", "proposed_date": "2026-11-05", "itinerary_id": itinerary.id},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "assigned"
    assert body["proposed_date"] == "2026-11-05"
    assert body["itinerary_id"] == itinerary.id
    assert body["booking_date"] == "2026-10-01"


def test_update_booking_rejects_requires_reason(client):
    tourist = _create_tourist(client)
    package = _create_package(client)
    _create_booking(client, tourist["id"], package["id"])

    response = client.patch(
        f"/api/bookings/{tourist['id']}/{package['id']}",
        json={"status": "rejected"},
    )

    assert response.status_code == 400
    assert "rejection reason" in response.json()["detail"].lower()


def test_update_booking_rejects_with_reason(client):
    tourist = _create_tourist(client)
    package = _create_package(client)
    _create_booking(client, tourist["id"], package["id"])

    response = client.patch(
        f"/api/bookings/{tourist['id']}/{package['id']}",
        json={"status": "rejected", "rejection_reason": "Sin cupos"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    assert response.json()["rejection_reason"] == "Sin cupos"


def test_update_booking_unknown_itinerary_returns_400(client):
    tourist = _create_tourist(client)
    package = _create_package(client)
    _create_booking(client, tourist["id"], package["id"])

    response = client.patch(
        f"/api/bookings/{tourist['id']}/{package['id']}",
        json={"itinerary_id": 999999},
    )

    assert response.status_code == 400


def test_update_booking_unknown_booking_returns_404(client):
    response = client.patch("/api/bookings/1/1", json={"status": "assigned"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Booking not found"


def test_create_booking_requires_both_ids(client):
    assert client.post("/api/bookings", json={"tourist_id": 1}).status_code == 422
    assert client.post("/api/bookings", json={"package_id": 1}).status_code == 422


def test_create_booking_with_unknown_tourist_returns_404(client):
    package = _create_package(client)

    response = _create_booking(client, 999999, package["id"])

    assert response.status_code == 404
    assert response.json()["detail"] == "Tourist not found"


def test_create_booking_with_user_that_is_not_a_tourist_returns_404(client):
    """A user without its Tourist subtype row cannot book."""
    admin = client.post(
        "/api/users",
        json={"name": "Ana", "role": "admin", "email": "ana@example.com", "password": "x"},
    ).json()
    package = _create_package(client)

    response = _create_booking(client, admin["id"], package["id"])

    assert response.status_code == 404
    assert response.json()["detail"] == "Tourist not found"


def test_create_booking_with_unknown_package_returns_404(client):
    tourist = _create_tourist(client)

    response = _create_booking(client, tourist["id"], 999999)

    assert response.status_code == 404
    assert response.json()["detail"] == "Package not found"


def test_create_booking_twice_returns_409(client):
    tourist = _create_tourist(client)
    package = _create_package(client)

    _create_booking(client, tourist["id"], package["id"])

    response = _create_booking(client, tourist["id"], package["id"])

    assert response.status_code == 409
    assert response.json()["detail"] == "Booking for this tourist and package already exists"


def test_list_bookings_returns_empty_list_initially(client):
    response = client.get("/api/bookings")

    assert response.status_code == 200
    assert response.json() == []


def test_list_bookings_includes_created_booking(client):
    tourist = _create_tourist(client)
    package = _create_package(client)
    _create_booking(client, tourist["id"], package["id"])

    response = client.get("/api/bookings")

    assert response.status_code == 200
    assert any(
        b["tourist_id"] == tourist["id"] and b["package_id"] == package["id"]
        for b in response.json()
    )


def test_list_bookings_filter_by_tourist_id(client):
    tourist_a = _create_tourist(client, email="filter-a@example.com")
    tourist_b = _create_tourist(client, email="filter-b@example.com")
    package_a = _create_package(client, name="A", destination="Roma")
    package_b = _create_package(client, name="B", destination="Lisboa")

    _create_booking(client, tourist_a["id"], package_a["id"])
    _create_booking(client, tourist_a["id"], package_b["id"])
    _create_booking(client, tourist_b["id"], package_a["id"])

    response = client.get(f"/api/bookings?tourist_id={tourist_a['id']}")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 2
    assert all(b["tourist_id"] == tourist_a["id"] for b in body)
    assert {b["package_id"] for b in body} == {package_a["id"], package_b["id"]}


def test_list_bookings_filter_by_tourist_id_empty_when_none(client):
    tourist = _create_tourist(client, email="filter-empty@example.com")

    response = client.get(f"/api/bookings?tourist_id={tourist['id']}")

    assert response.status_code == 200
    assert response.json() == []


def test_list_bookings_filter_by_unknown_tourist_id_returns_empty(client):
    response = client.get("/api/bookings?tourist_id=999999")

    assert response.status_code == 200
    assert response.json() == []


def test_get_booking_returns_created_booking(client):
    tourist = _create_tourist(client)
    package = _create_package(client)
    created = _create_booking(client, tourist["id"], package["id"]).json()

    response = client.get(f"/api/bookings/{tourist['id']}/{package['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_get_booking_returns_404_when_missing(client):
    response = client.get("/api/bookings/1/1")

    assert response.status_code == 404
    assert response.json()["detail"] == "Booking not found"


def test_delete_booking_returns_204_and_removes_it(client):
    tourist = _create_tourist(client)
    package = _create_package(client)
    _create_booking(client, tourist["id"], package["id"])

    response = client.delete(f"/api/bookings/{tourist['id']}/{package['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/bookings/{tourist['id']}/{package['id']}").status_code == 404


def test_delete_booking_twice_returns_404(client):
    tourist = _create_tourist(client)
    package = _create_package(client)
    _create_booking(client, tourist["id"], package["id"])

    client.delete(f"/api/bookings/{tourist['id']}/{package['id']}")

    response = client.delete(f"/api/bookings/{tourist['id']}/{package['id']}")

    assert response.status_code == 404


def test_booking_disappears_when_tourist_deleted(client):
    tourist = _create_tourist(client, email="cascada@example.com")
    package = _create_package(client)
    _create_booking(client, tourist["id"], package["id"])

    client.delete(f"/api/users/{tourist['id']}")

    response = client.get("/api/bookings")
    assert response.status_code == 200
    assert all(
        not (b["tourist_id"] == tourist["id"] and b["package_id"] == package["id"])
        for b in response.json()
    )


def test_booking_disappears_when_package_deleted(client):
    tourist = _create_tourist(client)
    package = _create_package(client)
    _create_booking(client, tourist["id"], package["id"])

    client.delete(f"/api/packages/{package['id']}")

    assert client.get(f"/api/bookings/{tourist['id']}/{package['id']}").status_code == 404


def test_create_booking_conflict_leaves_session_usable(client, db_session, monkeypatch):
    """A 409 from a real IntegrityError must not poison the shared session."""
    from app.models.booking import Booking
    from app.services import booking as booking_service

    tourist = _create_tourist(client, email="race@example.com")
    package = _create_package(client, name="Race", destination="Lugar")

    # Simulate the race window: the pre-check sees no duplicate...
    monkeypatch.setattr(booking_service, "get_booking", lambda *a, **k: None)
    # ...but another request already committed the pair.
    db_session.add(Booking(tourist_id=tourist["id"], package_id=package["id"]))
    db_session.commit()

    response = _create_booking(client, tourist["id"], package["id"])

    assert response.status_code == 409
    # The session must still be usable: no PendingRollbackError.
    assert client.get("/api/bookings").status_code == 200
    # And a subsequent create on a different pair works.
    tourist2 = _create_tourist(client, email="race2@example.com")
    assert (
        client.post(
            "/api/bookings",
            json={
                "tourist_id": tourist2["id"],
                "package_id": package["id"],
                "booking_date": "2026-10-02",
            },
        ).status_code
        == 201
    )

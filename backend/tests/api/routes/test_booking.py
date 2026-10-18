"""Tests for the booking routes."""


def _create_user(client, email="ada@example.com"):
    return client.post(
        "/api/users",
        json={"name": "Ada", "role": "tourist", "email": email, "password": "s3cret"},
    ).json()


def _create_package(client, name="Europa Capitales", destination="París"):
    return client.post(
        "/api/packages", json={"name": name, "destination": destination}
    ).json()


def _create_booking(client, user_id, package_id):
    return client.post(
        "/api/bookings", json={"user_id": user_id, "package_id": package_id}
    )


def test_create_booking_returns_201_and_pair(client):
    user = _create_user(client)
    package = _create_package(client)

    response = _create_booking(client, user["id"], package["id"])

    assert response.status_code == 201
    body = response.json()
    assert body == {"user_id": user["id"], "package_id": package["id"]}


def test_create_booking_requires_both_ids(client):
    assert client.post("/api/bookings", json={"user_id": 1}).status_code == 422
    assert client.post("/api/bookings", json={"package_id": 1}).status_code == 422


def test_create_booking_with_unknown_user_returns_404(client):
    package = _create_package(client)

    response = _create_booking(client, 999999, package["id"])

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"


def test_create_booking_with_unknown_package_returns_404(client):
    user = _create_user(client)

    response = _create_booking(client, user["id"], 999999)

    assert response.status_code == 404
    assert response.json()["detail"] == "Package not found"


def test_create_booking_twice_returns_409(client):
    user = _create_user(client)
    package = _create_package(client)

    _create_booking(client, user["id"], package["id"])

    response = _create_booking(client, user["id"], package["id"])

    assert response.status_code == 409
    assert response.json()["detail"] == "Booking for this user and package already exists"


def test_list_bookings_returns_empty_list_initially(client):
    response = client.get("/api/bookings")

    assert response.status_code == 200
    assert response.json() == []


def test_list_bookings_includes_created_booking(client):
    user = _create_user(client)
    package = _create_package(client)
    _create_booking(client, user["id"], package["id"])

    response = client.get("/api/bookings")

    assert response.status_code == 200
    assert any(
        b["user_id"] == user["id"] and b["package_id"] == package["id"]
        for b in response.json()
    )


def test_get_booking_returns_created_booking(client):
    user = _create_user(client)
    package = _create_package(client)
    created = _create_booking(client, user["id"], package["id"]).json()

    response = client.get(f"/api/bookings/{user['id']}/{package['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_get_booking_returns_404_when_missing(client):
    response = client.get("/api/bookings/1/1")

    assert response.status_code == 404
    assert response.json()["detail"] == "Booking not found"


def test_delete_booking_returns_204_and_removes_it(client):
    user = _create_user(client)
    package = _create_package(client)
    _create_booking(client, user["id"], package["id"])

    response = client.delete(f"/api/bookings/{user['id']}/{package['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/bookings/{user['id']}/{package['id']}").status_code == 404


def test_delete_booking_twice_returns_404(client):
    user = _create_user(client)
    package = _create_package(client)
    _create_booking(client, user["id"], package["id"])

    client.delete(f"/api/bookings/{user['id']}/{package['id']}")

    response = client.delete(f"/api/bookings/{user['id']}/{package['id']}")

    assert response.status_code == 404


def test_booking_disappears_when_user_deleted(client):
    user = _create_user(client, email="cascada@example.com")
    package = _create_package(client)
    _create_booking(client, user["id"], package["id"])

    client.delete(f"/api/users/{user['id']}")

    response = client.get("/api/bookings")
    assert response.status_code == 200
    assert all(
        not (b["user_id"] == user["id"] and b["package_id"] == package["id"])
        for b in response.json()
    )


def test_booking_disappears_when_package_deleted(client):
    user = _create_user(client)
    package = _create_package(client)
    _create_booking(client, user["id"], package["id"])

    client.delete(f"/api/packages/{package['id']}")

    assert client.get(f"/api/bookings/{user['id']}/{package['id']}").status_code == 404


def test_create_booking_conflict_leaves_session_usable(client, db_session, monkeypatch):
    """A 409 from a real IntegrityError must not poison the shared session."""
    from app.models.booking import Booking
    from app.services import booking as booking_service

    user = _create_user(client, email="race@example.com")
    package = _create_package(client, name="Race", destination="Lugar")

    # Simulate the race window: the pre-check sees no duplicate...
    monkeypatch.setattr(booking_service, "get_booking", lambda *a, **k: None)
    # ...but another request already committed the pair.
    db_session.add(Booking(user_id=user["id"], package_id=package["id"]))
    db_session.commit()

    response = _create_booking(client, user["id"], package["id"])

    assert response.status_code == 409
    # The session must still be usable: no PendingRollbackError.
    assert client.get("/api/bookings").status_code == 200
    # And a subsequent create on a different pair works.
    user2 = _create_user(client, email="race2@example.com")
    assert (
        client.post(
            "/api/bookings",
            json={"user_id": user2["id"], "package_id": package["id"]},
        ).status_code
        == 201
    )

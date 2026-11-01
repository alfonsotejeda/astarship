"""Tests for the package routes."""

from datetime import date


def _create_package(client, name="Europa Capitales", destination="París"):
    """Create a helper package through the API."""
    return client.post("/api/packages", json={"name": name, "destination": destination}).json()


def test_create_package_returns_201(client):
    response = client.post(
        "/api/packages", json={"name": "Rutas del Sur", "destination": "Sevilla"}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Rutas del Sur"
    assert body["destination"] == "Sevilla"
    assert body["status"] == "pending"
    assert body["creation_date"] == date.today().isoformat()
    assert body["id"] > 0


def test_create_package_requires_name_and_destination(client):
    assert client.post("/api/packages", json={"name": "Solo nombre"}).status_code == 422
    assert client.post("/api/packages", json={"destination": "Solo destino"}).status_code == 422


def test_create_package_ignores_status_in_payload(client):
    response = client.post(
        "/api/packages", json={"name": "X", "destination": "Y", "status": "approved"}
    )

    assert response.status_code == 201
    assert response.json()["status"] == "pending"


def test_create_package_returns_409_on_duplicate(client):
    _create_package(client)

    response = client.post(
        "/api/packages", json={"name": "Europa Capitales", "destination": "París"}
    )

    assert response.status_code == 409


def test_list_packages_includes_created_package(client):
    _create_package(client)

    response = client.get("/api/packages")

    assert response.status_code == 200
    assert any(p["name"] == "Europa Capitales" for p in response.json())


def test_get_package_returns_404_when_missing(client):
    response = client.get("/api/packages/999999")

    assert response.status_code == 404


def test_get_package_returns_created_package(client):
    created = _create_package(client, name="Costa Azul", destination="Niza")

    response = client.get(f"/api/packages/{created['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_update_package_treats_null_fields_as_not_sent(client):
    created = _create_package(client)

    response = client.patch(f"/api/packages/{created['id']}", json={"name": None, "status": None})

    assert response.status_code == 200
    assert response.json() == created


def test_update_package_changes_name(client):
    created = _create_package(client)

    response = client.patch(f"/api/packages/{created['id']}", json={"name": "Nuevo nombre"})

    assert response.status_code == 200
    assert response.json()["name"] == "Nuevo nombre"


def test_update_package_changes_status(client):
    created = _create_package(client)

    response = client.patch(f"/api/packages/{created['id']}", json={"status": "approved"})

    assert response.status_code == 200
    assert response.json()["status"] == "approved"


def test_update_package_rejects_unknown_status(client):
    created = _create_package(client)

    response = client.patch(f"/api/packages/{created['id']}", json={"status": "validated"})

    assert response.status_code == 422


def test_list_packages_filters_by_status(client):
    approved = _create_package(client, name="A", destination="Roma")
    _create_package(client, name="B", destination="Roma")
    client.patch(f"/api/packages/{approved['id']}", json={"status": "approved"})

    response = client.get("/api/packages", params={"status": "approved"})

    assert response.status_code == 200
    assert [p["id"] for p in response.json()] == [approved["id"]]


def test_list_packages_rejects_unknown_status(client):
    assert client.get("/api/packages", params={"status": "foo"}).status_code == 422


def test_update_package_returns_409_on_duplicate(client):
    _create_package(client, name="A", destination="Roma")
    second = _create_package(client, name="B", destination="Roma")

    response = client.patch(f"/api/packages/{second['id']}", json={"name": "A"})

    assert response.status_code == 409


def test_delete_package_removes_it(client):
    created = _create_package(client)

    response = client.delete(f"/api/packages/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/packages/{created['id']}").status_code == 404


def _create_tourist(client, email="ada@example.com", age=30):
    return client.post(
        "/api/users",
        json={"name": "Ada", "role": "tourist", "email": email, "password": "s3cret", "age": age},
    ).json()


def _create_booking(client, tourist_id, package_id, booking_date="2026-10-01"):
    return client.post(
        "/api/bookings",
        json={"tourist_id": tourist_id, "package_id": package_id, "booking_date": booking_date},
    )


def test_get_package_tourists_returns_booked_tourists(client):
    tourist = _create_tourist(client, email="pkgtourist@example.com", age=30)
    package = _create_package(client)
    _create_booking(client, tourist["id"], package["id"])

    response = client.get(f"/api/packages/{package['id']}/tourists")

    assert response.status_code == 200
    assert any(t["age"] == 30 for t in response.json())


def test_get_package_tourists_returns_404_when_package_missing(client):
    response = client.get("/api/packages/999999/tourists")

    assert response.status_code == 404


def test_get_package_tourists_empty_when_no_bookings(client):
    package = _create_package(client)

    response = client.get(f"/api/packages/{package['id']}/tourists")

    assert response.status_code == 200
    assert response.json() == []


def test_create_package_conflict_leaves_session_usable(client, db_session, monkeypatch):
    """A 409 from a real IntegrityError must not poison the shared session."""
    from app.models.package import Package
    from app.services import package as package_service

    # Simulate the race window: the pre-check sees no duplicate...
    monkeypatch.setattr(package_service, "find_package_by_name_destination", lambda *a, **k: None)
    # ...but another request already committed the pair.
    db_session.add(Package(name="Roma", destination="Coliseo"))
    db_session.commit()

    response = client.post("/api/packages", json={"name": "Roma", "destination": "Coliseo"})

    assert response.status_code == 409
    # The session must still be usable: no PendingRollbackError.
    assert client.get("/api/packages").status_code == 200
    # And a subsequent create on the same session works.
    assert (
        client.post("/api/packages", json={"name": "Otro", "destination": "Lugar"}).status_code
        == 201
    )

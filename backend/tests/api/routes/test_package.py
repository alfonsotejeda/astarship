"""Tests for the package routes."""

from datetime import date

import pytest


@pytest.fixture
def admin_id(client):
    """Id of an admin that generates the packages of a test."""
    return client.post(
        "/api/users",
        json={"name": "Ada", "role": "admin", "email": "ada@example.com", "password": "x"},
    ).json()["id"]


def _create_package(client, admin_id, name="Europa Capitales", destination="París"):
    """Create a helper package through the API."""
    return client.post(
        "/api/packages", json={"name": name, "destination": destination, "admin_id": admin_id}
    ).json()


def test_create_package_returns_201(client, admin_id):
    response = client.post(
        "/api/packages", json={"name": "Rutas del Sur", "destination": "Sevilla", "admin_id": admin_id}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Rutas del Sur"
    assert body["destination"] == "Sevilla"
    assert body["status"] == "pending"
    assert body["creation_date"] == date.today().isoformat()
    assert body["admin_id"] == admin_id
    assert body["id"] > 0


def test_create_package_requires_name_and_destination(client, admin_id):
    assert client.post("/api/packages", json={"name": "Solo nombre", "admin_id": admin_id}).status_code == 422
    assert client.post("/api/packages", json={"destination": "Solo destino", "admin_id": admin_id}).status_code == 422


def test_create_package_requires_admin_id(client, admin_id):
    response = client.post("/api/packages", json={"name": "X", "destination": "Y"})

    assert response.status_code == 422


def test_create_package_returns_404_when_admin_missing(client, admin_id):
    response = client.post(
        "/api/packages", json={"name": "X", "destination": "Y", "admin_id": 999999}
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Admin not found"


def test_create_package_rejects_non_admin_user(client, admin_id):
    guide_id = client.post(
        "/api/users",
        json={
            "name": "Gil",
            "role": "guide",
            "email": "gil@example.com",
            "password": "x",
            "specialty": "History",
        },
    ).json()["id"]

    response = client.post(
        "/api/packages", json={"name": "X", "destination": "Y", "admin_id": guide_id}
    )

    assert response.status_code == 404


def test_update_package_ignores_admin_id(client, admin_id):
    created = _create_package(client, admin_id)

    response = client.patch(f"/api/packages/{created['id']}", json={"admin_id": 999999})

    assert response.status_code == 200
    assert response.json()["admin_id"] == admin_id


def test_create_package_ignores_status_in_payload(client, admin_id):
    response = client.post(
        "/api/packages", json={"name": "X", "destination": "Y", "status": "approved", "admin_id": admin_id}
    )

    assert response.status_code == 201
    assert response.json()["status"] == "pending"


def test_create_package_returns_409_on_duplicate(client, admin_id):
    _create_package(client, admin_id)

    response = client.post(
        "/api/packages", json={"name": "Europa Capitales", "destination": "París", "admin_id": admin_id}
    )

    assert response.status_code == 409


def test_list_packages_includes_created_package(client, admin_id):
    _create_package(client, admin_id)

    response = client.get("/api/packages")

    assert response.status_code == 200
    assert any(p["name"] == "Europa Capitales" for p in response.json())


def test_get_package_returns_404_when_missing(client, admin_id):
    response = client.get("/api/packages/999999")

    assert response.status_code == 404


def test_get_package_returns_created_package(client, admin_id):
    created = _create_package(client, admin_id, name="Costa Azul", destination="Niza")

    response = client.get(f"/api/packages/{created['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_update_package_treats_null_fields_as_not_sent(client, admin_id):
    created = _create_package(client, admin_id)

    response = client.patch(
        f"/api/packages/{created['id']}", json={"name": None, "status": None}
    )

    assert response.status_code == 200
    assert response.json() == created


def test_update_package_changes_name(client, admin_id):
    created = _create_package(client, admin_id)

    response = client.patch(f"/api/packages/{created['id']}", json={"name": "Nuevo nombre"})

    assert response.status_code == 200
    assert response.json()["name"] == "Nuevo nombre"


def test_update_package_changes_status(client, admin_id):
    created = _create_package(client, admin_id)

    response = client.patch(f"/api/packages/{created['id']}", json={"status": "approved"})

    assert response.status_code == 200
    assert response.json()["status"] == "approved"


def test_update_package_rejects_unknown_status(client, admin_id):
    created = _create_package(client, admin_id)

    response = client.patch(f"/api/packages/{created['id']}", json={"status": "validated"})

    assert response.status_code == 422


def test_list_packages_filters_by_status(client, admin_id):
    approved = _create_package(client, admin_id, name="A", destination="Roma")
    _create_package(client, admin_id, name="B", destination="Roma")
    client.patch(f"/api/packages/{approved['id']}", json={"status": "approved"})

    response = client.get("/api/packages", params={"status": "approved"})

    assert response.status_code == 200
    assert [p["id"] for p in response.json()] == [approved["id"]]


def test_list_packages_rejects_unknown_status(client, admin_id):
    assert client.get("/api/packages", params={"status": "foo"}).status_code == 422


def test_update_package_returns_409_on_duplicate(client, admin_id):
    _create_package(client, admin_id, name="A", destination="Roma")
    second = _create_package(client, admin_id, name="B", destination="Roma")

    response = client.patch(f"/api/packages/{second['id']}", json={"name": "A"})

    assert response.status_code == 409


def test_delete_package_removes_it(client, admin_id):
    created = _create_package(client, admin_id)

    response = client.delete(f"/api/packages/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/packages/{created['id']}").status_code == 404


def test_create_package_conflict_leaves_session_usable(client, db_session, monkeypatch, admin_id):
    """A 409 from a real IntegrityError must not poison the shared session."""
    from app.models.package import Package
    from app.services import package as package_service

    # Simulate the race window: the pre-check sees no duplicate...
    monkeypatch.setattr(package_service, "find_package_by_name_destination", lambda *a, **k: None)
    # ...but another request already committed the pair.
    db_session.add(Package(name="Roma", destination="Coliseo", admin_id=admin_id))
    db_session.commit()

    response = client.post("/api/packages", json={"name": "Roma", "destination": "Coliseo", "admin_id": admin_id})

    assert response.status_code == 409
    # The session must still be usable: no PendingRollbackError.
    assert client.get("/api/packages").status_code == 200
    # And a subsequent create on the same session works.
    assert (
        client.post("/api/packages", json={"name": "Otro", "destination": "Lugar", "admin_id": admin_id}).status_code
        == 201
    )

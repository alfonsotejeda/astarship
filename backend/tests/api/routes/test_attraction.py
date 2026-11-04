"""Tests for the attraction routes."""

import pytest

PAYLOAD = {"name": "Malecón", "address": "Av. del Puerto", "latitude": 23.14, "longitude": -82.36}


@pytest.fixture
def guide_id(client):
    """Id of a guide, a role that can read attractions but not change them."""
    return client.post(
        "/api/users",
        json={
            "name": "Gil",
            "role": "guide",
            "email": "gil@example.com",
            "password": "x",
            "specialty": "History",
        },
    ).json()["id"]


def test_create_attraction_returns_201(client):
    response = client.post("/api/attractions", json=PAYLOAD)

    assert response.status_code == 201
    body = response.json()
    assert body["id"] is not None
    assert {k: body[k] for k in PAYLOAD} == PAYLOAD


def test_create_attraction_returns_422_for_invalid_coordinates(client):
    response = client.post("/api/attractions", json={**PAYLOAD, "latitude": 91})

    assert response.status_code == 422


def test_create_attraction_returns_403_for_non_admin(client, as_user, guide_id):
    with as_user(guide_id):
        response = client.post("/api/attractions", json=PAYLOAD)

    assert response.status_code == 403


def test_create_attraction_returns_401_without_credentials(anonymous_client):
    response = anonymous_client.post("/api/attractions", json=PAYLOAD)

    assert response.status_code == 401


def test_list_attractions_includes_created_attraction(client):
    client.post("/api/attractions", json=PAYLOAD)

    response = client.get("/api/attractions")

    assert response.status_code == 200
    assert any(a["name"] == "Malecón" for a in response.json())


def test_list_attractions_is_allowed_for_non_admin(client, as_user, guide_id):
    with as_user(guide_id):
        response = client.get("/api/attractions")

    assert response.status_code == 200


def test_get_attraction_returns_it(client):
    created = client.post("/api/attractions", json=PAYLOAD).json()

    response = client.get(f"/api/attractions/{created['id']}")

    assert response.status_code == 200
    assert response.json() == created


def test_get_attraction_returns_404_when_missing(client):
    response = client.get("/api/attractions/999")

    assert response.status_code == 404


def test_update_attraction_changes_only_sent_fields(client):
    created = client.post("/api/attractions", json=PAYLOAD).json()

    response = client.patch(f"/api/attractions/{created['id']}", json={"name": "New"})

    assert response.status_code == 200
    assert response.json() == {**created, "name": "New"}


def test_update_attraction_returns_422_for_null_field(client):
    created = client.post("/api/attractions", json=PAYLOAD).json()

    response = client.patch(f"/api/attractions/{created['id']}", json={"name": None})

    assert response.status_code == 422


def test_update_attraction_returns_404_when_missing(client):
    response = client.patch("/api/attractions/999", json={"name": "New"})

    assert response.status_code == 404


def test_update_attraction_returns_403_for_non_admin(client, as_user, guide_id):
    created = client.post("/api/attractions", json=PAYLOAD).json()

    with as_user(guide_id):
        response = client.patch(f"/api/attractions/{created['id']}", json={"name": "New"})

    assert response.status_code == 403


def test_delete_attraction_removes_it(client):
    created = client.post("/api/attractions", json=PAYLOAD).json()

    response = client.delete(f"/api/attractions/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/attractions/{created['id']}").status_code == 404


def test_delete_attraction_returns_403_for_non_admin(client, as_user, guide_id):
    created = client.post("/api/attractions", json=PAYLOAD).json()

    with as_user(guide_id):
        response = client.delete(f"/api/attractions/{created['id']}")

    assert response.status_code == 403

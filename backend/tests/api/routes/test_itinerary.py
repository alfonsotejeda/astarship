"""Tests for the itinerary routes."""

import pytest


def _create_guide(client, email="gil@example.com") -> int:
    return client.post(
        "/api/users",
        json={
            "name": "Gil",
            "role": "guide",
            "email": email,
            "password": "x",
            "specialty": "History",
        },
    ).json()["id"]


def _create_package(client, admin_id, name="Andes") -> int:
    return client.post(
        "/api/packages", json={"name": name, "destination": "Peru", "admin_id": admin_id}
    ).json()["id"]


def _authorize(client, package_id, guide_id, can_generate=True) -> None:
    client.put(
        f"/api/authorizations/packages/{package_id}/guides/{guide_id}",
        json={"can_generate": can_generate, "can_validate": False},
    )


@pytest.fixture
def admin_id(client):
    """Id of an admin that generates the packages of a test."""
    return client.post(
        "/api/users",
        json={"name": "Ada", "role": "admin", "email": "ada@example.com", "password": "x"},
    ).json()["id"]


@pytest.fixture
def payload(client, admin_id):
    package_id = _create_package(client, admin_id)
    guide_id = _create_guide(client)
    _authorize(client, package_id, guide_id)
    return {
        "creation_date": "2026-01-01",
        "activity_count": 2,
        "package_id": package_id,
        "guide_id": guide_id,
    }


@pytest.fixture
def generate(client, as_user, payload):
    """Post an itinerary as the guide authorized in the payload."""

    def post(**overrides):
        with as_user(payload["guide_id"]):
            return client.post("/api/itineraries", json={**payload, **overrides})

    return post


def test_create_itinerary_returns_201(generate, payload):
    response = generate()

    assert response.status_code == 201
    body = response.json()
    assert body["creation_date"] == "2026-01-01"
    assert body["activity_count"] == 2
    assert body["status"] == "pending"
    assert body["package_id"] == payload["package_id"]
    assert body["guide_id"] == payload["guide_id"]
    assert "id" in body


def test_create_itinerary_returns_404_when_package_missing(generate):
    assert generate(package_id=999).status_code == 404


def test_create_itinerary_returns_404_when_guide_missing(generate):
    assert generate(guide_id=999).status_code == 404


def test_create_itinerary_returns_403_without_authorization(client, admin_id, generate):
    other_package_id = _create_package(client, admin_id, name="Patagonia")

    assert generate(package_id=other_package_id).status_code == 403


def test_create_itinerary_returns_403_without_can_generate(client, payload, generate):
    _authorize(client, payload["package_id"], payload["guide_id"], can_generate=False)

    assert generate().status_code == 403


def test_create_itinerary_returns_403_for_non_guide(client, payload):
    response = client.post("/api/itineraries", json=payload)

    assert response.status_code == 403


def test_create_itinerary_returns_403_on_behalf_of_another_guide(client, as_user, payload):
    other_guide_id = _create_guide(client, email="gus@example.com")

    with as_user(payload["guide_id"]):
        response = client.post("/api/itineraries", json={**payload, "guide_id": other_guide_id})

    assert response.status_code == 403


def test_list_itineraries_includes_created_itinerary(client, generate):
    generate()

    response = client.get("/api/itineraries")

    assert response.status_code == 200
    assert any(i["activity_count"] == 2 for i in response.json())


def test_get_itinerary_returns_404_when_missing(client):
    response = client.get("/api/itineraries/999")

    assert response.status_code == 404


def test_update_itinerary_changes_status(client, generate):
    created = generate().json()

    response = client.patch(f"/api/itineraries/{created['id']}", json={"status": "validated"})

    assert response.status_code == 200
    assert response.json()["status"] == "validated"


def test_update_itinerary_returns_403_for_another_guide(client, as_user, generate):
    created = generate().json()
    other_guide_id = _create_guide(client, email="gus@example.com")

    with as_user(other_guide_id):
        response = client.patch(f"/api/itineraries/{created['id']}", json={"status": "validated"})

    assert response.status_code == 403


def test_delete_itinerary_removes_it(client, generate):
    created = generate().json()

    response = client.delete(f"/api/itineraries/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/itineraries/{created['id']}").status_code == 404


def test_delete_itinerary_returns_403_for_guide(client, as_user, payload, generate):
    created = generate().json()

    with as_user(payload["guide_id"]):
        response = client.delete(f"/api/itineraries/{created['id']}")

    assert response.status_code == 403


def test_list_itineraries_filters_by_status(client, generate):
    validated = generate().json()
    generate()
    client.patch(f"/api/itineraries/{validated['id']}", json={"status": "validated"})

    response = client.get("/api/itineraries", params={"status": "validated"})

    assert response.status_code == 200
    assert [i["id"] for i in response.json()] == [validated["id"]]

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


def _create_package(client, name="Andes") -> int:
    return client.post("/api/packages", json={"name": name, "destination": "Peru"}).json()["id"]


def _authorize(client, package_id, guide_id, can_generate=True) -> None:
    client.put(
        f"/api/authorizations/packages/{package_id}/guides/{guide_id}",
        json={"can_generate": can_generate, "can_validate": False},
    )


@pytest.fixture
def payload(client):
    package_id = _create_package(client)
    guide_id = _create_guide(client)
    _authorize(client, package_id, guide_id)
    return {
        "creation_date": "2026-01-01",
        "activity_count": 2,
        "package_id": package_id,
        "guide_id": guide_id,
    }


def test_create_itinerary_returns_201(client, payload):
    response = client.post("/api/itineraries", json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["creation_date"] == "2026-01-01"
    assert body["activity_count"] == 2
    assert body["status"] == "pending"
    assert body["package_id"] == payload["package_id"]
    assert body["guide_id"] == payload["guide_id"]
    assert "id" in body


def test_create_itinerary_returns_404_when_package_missing(client, payload):
    response = client.post("/api/itineraries", json={**payload, "package_id": 999})

    assert response.status_code == 404


def test_create_itinerary_returns_404_when_guide_missing(client, payload):
    response = client.post("/api/itineraries", json={**payload, "guide_id": 999})

    assert response.status_code == 404


def test_create_itinerary_returns_403_without_authorization(client, payload):
    other_package_id = _create_package(client, name="Patagonia")

    response = client.post("/api/itineraries", json={**payload, "package_id": other_package_id})

    assert response.status_code == 403


def test_create_itinerary_returns_403_without_can_generate(client, payload):
    _authorize(client, payload["package_id"], payload["guide_id"], can_generate=False)

    response = client.post("/api/itineraries", json=payload)

    assert response.status_code == 403


def test_list_itineraries_includes_created_itinerary(client, payload):
    client.post("/api/itineraries", json=payload)

    response = client.get("/api/itineraries")

    assert response.status_code == 200
    assert any(i["activity_count"] == 2 for i in response.json())


def test_get_itinerary_returns_404_when_missing(client):
    response = client.get("/api/itineraries/999")

    assert response.status_code == 404


def test_update_itinerary_changes_status(client, payload):
    created = client.post("/api/itineraries", json=payload).json()

    response = client.patch(f"/api/itineraries/{created['id']}", json={"status": "validated"})

    assert response.status_code == 200
    assert response.json()["status"] == "validated"


def test_delete_itinerary_removes_it(client, payload):
    created = client.post("/api/itineraries", json=payload).json()

    response = client.delete(f"/api/itineraries/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/itineraries/{created['id']}").status_code == 404


def test_list_itineraries_filters_by_status(client, payload):
    validated = client.post("/api/itineraries", json=payload).json()
    client.post("/api/itineraries", json=payload)
    client.patch(f"/api/itineraries/{validated['id']}", json={"status": "validated"})

    response = client.get("/api/itineraries", params={"status": "validated"})

    assert response.status_code == 200
    assert [i["id"] for i in response.json()] == [validated["id"]]

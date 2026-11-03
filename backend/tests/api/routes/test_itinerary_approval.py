"""Tests for the itinerary approval routes."""

import pytest


def _create_itinerary(client, status="validated") -> int:
    itinerary_id = client.post(
        "/api/itineraries", json={"creation_date": "2026-01-01", "activity_count": 2}
    ).json()["id"]
    client.patch(f"/api/itineraries/{itinerary_id}", json={"status": status})
    return itinerary_id


def _create_user(client, role, email, **fields) -> int:
    return client.post(
        "/api/users",
        json={"name": "Olga", "role": role, "email": email, "password": "x", **fields},
    ).json()["id"]


def _create_manager(client, email="olga@example.com") -> int:
    return _create_user(client, "operations_manager", email)


def _url(itinerary_id: int) -> str:
    return f"/api/itineraries/{itinerary_id}/approvals"


def test_create_approval_returns_201_and_approves_the_itinerary(client):
    itinerary_id = _create_itinerary(client)
    manager_id = _create_manager(client)

    response = client.post(
        _url(itinerary_id), json={"manager_id": manager_id, "result": "approved"}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["itinerary_id"] == itinerary_id
    assert body["manager_id"] == manager_id
    assert body["result"] == "approved"
    assert body["observations"] is None
    assert body["approval_date"]
    assert client.get(f"/api/itineraries/{itinerary_id}").json()["status"] == "approved"


def test_create_rejection_rejects_the_itinerary(client):
    itinerary_id = _create_itinerary(client)
    manager_id = _create_manager(client)

    response = client.post(
        _url(itinerary_id),
        json={"manager_id": manager_id, "result": "rejected", "observations": "Redo it"},
    )

    assert response.status_code == 201
    assert response.json()["observations"] == "Redo it"
    assert client.get(f"/api/itineraries/{itinerary_id}").json()["status"] == "rejected"


@pytest.mark.parametrize("status", ["pending", "approved", "rejected"])
def test_create_approval_of_non_validated_itinerary_returns_409(client, status):
    itinerary_id = _create_itinerary(client, status=status)
    manager_id = _create_manager(client)

    response = client.post(
        _url(itinerary_id), json={"manager_id": manager_id, "result": "approved"}
    )

    assert response.status_code == 409
    assert client.get(f"/api/itineraries/{itinerary_id}").json()["status"] == status


def test_create_approval_of_missing_itinerary_returns_404(client):
    manager_id = _create_manager(client)

    response = client.post(_url(999), json={"manager_id": manager_id, "result": "approved"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Itinerary not found"


def test_create_approval_by_non_manager_returns_404(client):
    itinerary_id = _create_itinerary(client)
    admin_id = _create_user(client, "admin", "ana@example.com")

    response = client.post(_url(itinerary_id), json={"manager_id": admin_id, "result": "approved"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Operations manager not found"


@pytest.mark.parametrize(
    "payload",
    [
        {"result": "approved"},
        {"manager_id": 1},
        {"manager_id": 1, "result": "validated"},
        {"manager_id": 1, "result": "rejected"},
    ],
)
def test_create_approval_with_invalid_payload_returns_422(client, payload):
    itinerary_id = _create_itinerary(client)

    response = client.post(_url(itinerary_id), json=payload)

    assert response.status_code == 422


def test_list_approvals_returns_the_decisions_oldest_first(client):
    itinerary_id = _create_itinerary(client)
    manager_id = _create_manager(client)
    client.post(
        _url(itinerary_id),
        json={"manager_id": manager_id, "result": "rejected", "observations": "Redo it"},
    )
    client.patch(f"/api/itineraries/{itinerary_id}", json={"status": "validated"})
    client.post(_url(itinerary_id), json={"manager_id": manager_id, "result": "approved"})

    response = client.get(_url(itinerary_id))

    assert response.status_code == 200
    assert [item["result"] for item in response.json()] == ["rejected", "approved"]


def test_list_approvals_of_missing_itinerary_returns_404(client):
    response = client.get(_url(999))

    assert response.status_code == 404

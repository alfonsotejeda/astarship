"""Tests for the assignment routes."""

from datetime import date


def _create_itinerary(client, owners) -> int:
    return client.post(
        "/api/itineraries", json={"creation_date": "2026-01-01", "activity_count": 2, **owners}
    ).json()["id"]


def _create_user(client, role, email, **fields) -> int:
    return client.post(
        "/api/users",
        json={"name": "Ada", "role": role, "email": email, "password": "x", **fields},
    ).json()["id"]


def _create_tourist(client, email="ada@example.com") -> int:
    return _create_user(client, "tourist", email, age=30)


def _create_admin(client, email="ana@example.com") -> int:
    return _create_user(client, "admin", email)


def test_create_assignment_returns_201(client, itinerary_owners):
    itinerary_id = _create_itinerary(client, itinerary_owners)
    tourist_id = _create_tourist(client)
    admin_id = _create_admin(client)

    response = client.post(
        f"/api/itineraries/{itinerary_id}/assignments/{tourist_id}", json={"admin_id": admin_id}
    )

    assert response.status_code == 201
    assert response.json() == {
        "itinerary_id": itinerary_id,
        "tourist_id": tourist_id,
        "assignment_date": date.today().isoformat(),
        "status": "assigned",
        "admin_id": admin_id,
    }


def test_create_assignment_twice_returns_409(client, itinerary_owners):
    itinerary_id = _create_itinerary(client, itinerary_owners)
    tourist_id = _create_tourist(client)
    admin_id = _create_admin(client)
    url = f"/api/itineraries/{itinerary_id}/assignments/{tourist_id}"
    client.post(url, json={"admin_id": admin_id})

    response = client.post(url, json={"admin_id": admin_id})

    assert response.status_code == 409


def test_create_assignment_returns_404_when_itinerary_missing(client):
    tourist_id = _create_tourist(client)
    admin_id = _create_admin(client)

    response = client.post(
        f"/api/itineraries/999999/assignments/{tourist_id}", json={"admin_id": admin_id}
    )

    assert response.status_code == 404


def test_create_assignment_returns_404_when_user_is_not_a_tourist(client, itinerary_owners):
    itinerary_id = _create_itinerary(client, itinerary_owners)
    admin_id = _create_admin(client)

    response = client.post(
        f"/api/itineraries/{itinerary_id}/assignments/{admin_id}", json={"admin_id": admin_id}
    )

    assert response.status_code == 404


def test_create_assignment_returns_404_when_user_is_not_an_admin(client, itinerary_owners):
    itinerary_id = _create_itinerary(client, itinerary_owners)
    tourist_id = _create_tourist(client)

    response = client.post(
        f"/api/itineraries/{itinerary_id}/assignments/{tourist_id}", json={"admin_id": tourist_id}
    )

    assert response.status_code == 404


def test_create_assignment_without_admin_returns_422(client, itinerary_owners):
    itinerary_id = _create_itinerary(client, itinerary_owners)
    tourist_id = _create_tourist(client)

    response = client.post(f"/api/itineraries/{itinerary_id}/assignments/{tourist_id}", json={})

    assert response.status_code == 422


def test_update_assignment_changes_the_status(client, itinerary_owners):
    itinerary_id = _create_itinerary(client, itinerary_owners)
    tourist_id = _create_tourist(client)
    admin_id = _create_admin(client)
    url = f"/api/itineraries/{itinerary_id}/assignments/{tourist_id}"
    client.post(url, json={"admin_id": admin_id})

    response = client.patch(url, json={"status": "in_progress"})

    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"


def test_update_assignment_with_unknown_status_returns_422(client, itinerary_owners):
    itinerary_id = _create_itinerary(client, itinerary_owners)
    tourist_id = _create_tourist(client)
    admin_id = _create_admin(client)
    url = f"/api/itineraries/{itinerary_id}/assignments/{tourist_id}"
    client.post(url, json={"admin_id": admin_id})

    response = client.patch(url, json={"status": "lost"})

    assert response.status_code == 422


def test_update_assignment_returns_404_when_missing(client, itinerary_owners):
    itinerary_id = _create_itinerary(client, itinerary_owners)
    tourist_id = _create_tourist(client)

    response = client.patch(
        f"/api/itineraries/{itinerary_id}/assignments/{tourist_id}", json={"status": "finished"}
    )

    assert response.status_code == 404


def test_list_assignments_returns_the_itinerary_tourists(client, itinerary_owners):
    itinerary_id = _create_itinerary(client, itinerary_owners)
    ada = _create_tourist(client, "ada@example.com")
    bob = _create_tourist(client, "bob@example.com")
    admin_id = _create_admin(client)
    client.post(f"/api/itineraries/{itinerary_id}/assignments/{ada}", json={"admin_id": admin_id})
    client.post(f"/api/itineraries/{itinerary_id}/assignments/{bob}", json={"admin_id": admin_id})

    response = client.get(f"/api/itineraries/{itinerary_id}/assignments")

    assert response.status_code == 200
    assert {a["tourist_id"] for a in response.json()} == {ada, bob}


def test_list_assignments_returns_404_when_itinerary_missing(client):
    response = client.get("/api/itineraries/999999/assignments")

    assert response.status_code == 404


def test_list_tourist_assignments_returns_its_itineraries(client, itinerary_owners):
    first = _create_itinerary(client, itinerary_owners)
    second = _create_itinerary(client, itinerary_owners)
    tourist_id = _create_tourist(client)
    admin_id = _create_admin(client)
    client.post(f"/api/itineraries/{first}/assignments/{tourist_id}", json={"admin_id": admin_id})
    client.post(f"/api/itineraries/{second}/assignments/{tourist_id}", json={"admin_id": admin_id})

    response = client.get(f"/api/users/{tourist_id}/assignments")

    assert response.status_code == 200
    assert {a["itinerary_id"] for a in response.json()} == {first, second}


def test_list_tourist_assignments_returns_404_when_not_a_tourist(client):
    admin_id = _create_admin(client)

    response = client.get(f"/api/users/{admin_id}/assignments")

    assert response.status_code == 404


def test_delete_assignment_returns_204(client, itinerary_owners):
    itinerary_id = _create_itinerary(client, itinerary_owners)
    tourist_id = _create_tourist(client)
    admin_id = _create_admin(client)
    url = f"/api/itineraries/{itinerary_id}/assignments/{tourist_id}"
    client.post(url, json={"admin_id": admin_id})

    response = client.delete(url)

    assert response.status_code == 204
    assert client.get(f"/api/itineraries/{itinerary_id}/assignments").json() == []


def test_delete_assignment_returns_404_when_missing(client, itinerary_owners):
    itinerary_id = _create_itinerary(client, itinerary_owners)
    tourist_id = _create_tourist(client)

    response = client.delete(f"/api/itineraries/{itinerary_id}/assignments/{tourist_id}")

    assert response.status_code == 404

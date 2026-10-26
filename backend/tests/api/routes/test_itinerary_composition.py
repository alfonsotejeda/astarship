"""Tests for the itinerary composition routes."""

import pytest

COMPOSITION = {"order": 1, "day": 1, "start_time": "09:00:00"}


def _create_itinerary(client) -> int:
    return client.post(
        "/api/itineraries", json={"creation_date": "2026-01-01", "activity_count": 2}
    ).json()["id"]


def _create_activity(client, name="Museum") -> int:
    return client.post("/api/activities", json={"name": name, "effort_level": 1}).json()["id"]


def test_create_composition_returns_201(client):
    itinerary_id = _create_itinerary(client)
    activity_id = _create_activity(client)

    response = client.post(
        f"/api/itineraries/{itinerary_id}/activities/{activity_id}", json=COMPOSITION
    )

    assert response.status_code == 201
    assert response.json() == {
        "itinerary_id": itinerary_id,
        "activity_id": activity_id,
        **COMPOSITION,
    }


def test_create_composition_twice_returns_409(client):
    itinerary_id = _create_itinerary(client)
    activity_id = _create_activity(client)
    url = f"/api/itineraries/{itinerary_id}/activities/{activity_id}"
    client.post(url, json=COMPOSITION)

    response = client.post(url, json=COMPOSITION)

    assert response.status_code == 409


@pytest.mark.parametrize("field", ["order", "day"])
def test_create_composition_returns_422_when_value_not_positive(client, field):
    itinerary_id = _create_itinerary(client)
    activity_id = _create_activity(client)

    response = client.post(
        f"/api/itineraries/{itinerary_id}/activities/{activity_id}",
        json={**COMPOSITION, field: 0},
    )

    assert response.status_code == 422


def test_create_composition_returns_404_when_itinerary_missing(client):
    activity_id = _create_activity(client)

    response = client.post(f"/api/itineraries/999999/activities/{activity_id}", json=COMPOSITION)

    assert response.status_code == 404


def test_create_composition_returns_404_when_activity_missing(client):
    itinerary_id = _create_itinerary(client)

    response = client.post(f"/api/itineraries/{itinerary_id}/activities/999999", json=COMPOSITION)

    assert response.status_code == 404


def test_update_composition_reschedules_the_activity(client):
    itinerary_id = _create_itinerary(client)
    activity_id = _create_activity(client)
    url = f"/api/itineraries/{itinerary_id}/activities/{activity_id}"
    client.post(url, json=COMPOSITION)

    response = client.patch(url, json={"day": 2, "start_time": "15:30:00"})

    assert response.status_code == 200
    body = response.json()
    assert body["day"] == 2
    assert body["start_time"] == "15:30:00"
    assert body["order"] == 1


def test_update_composition_returns_404_when_missing(client):
    itinerary_id = _create_itinerary(client)
    activity_id = _create_activity(client)

    response = client.patch(
        f"/api/itineraries/{itinerary_id}/activities/{activity_id}", json={"day": 2}
    )

    assert response.status_code == 404


def test_list_compositions_returns_the_activities_in_order(client):
    itinerary_id = _create_itinerary(client)
    museum = _create_activity(client, "Museum")
    hike = _create_activity(client, "Hike")
    client.post(
        f"/api/itineraries/{itinerary_id}/activities/{museum}", json={**COMPOSITION, "order": 2}
    )
    client.post(f"/api/itineraries/{itinerary_id}/activities/{hike}", json=COMPOSITION)

    response = client.get(f"/api/itineraries/{itinerary_id}/activities")

    assert response.status_code == 200
    assert [c["activity_id"] for c in response.json()] == [hike, museum]


def test_list_compositions_returns_404_when_itinerary_missing(client):
    response = client.get("/api/itineraries/999999/activities")

    assert response.status_code == 404


def test_delete_composition_returns_204(client):
    itinerary_id = _create_itinerary(client)
    activity_id = _create_activity(client)
    client.post(f"/api/itineraries/{itinerary_id}/activities/{activity_id}", json=COMPOSITION)

    response = client.delete(f"/api/itineraries/{itinerary_id}/activities/{activity_id}")

    assert response.status_code == 204
    assert client.get(f"/api/itineraries/{itinerary_id}/activities").json() == []


def test_delete_composition_returns_404_when_missing(client):
    itinerary_id = _create_itinerary(client)
    activity_id = _create_activity(client)

    response = client.delete(f"/api/itineraries/{itinerary_id}/activities/{activity_id}")

    assert response.status_code == 404

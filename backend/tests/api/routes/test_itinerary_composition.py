"""Tests for the itinerary composition routes."""

import pytest

COMPOSITION = {"order": 1, "day": 1, "start_time": "09:00:00"}


@pytest.fixture
def create_activity(client, as_user, itinerary_owners):
    """Return a function that creates an activity as the guide of the test itineraries."""

    def create(name="Museum") -> int:
        with as_user(itinerary_owners["guide_id"]):
            response = client.post("/api/activities", json={"name": name, "effort_level": 1})
        return response.json()["id"]

    return create


def test_create_composition_returns_201(client, create_itinerary, create_activity):
    itinerary_id = create_itinerary()
    activity_id = create_activity()

    response = client.post(
        f"/api/itineraries/{itinerary_id}/activities/{activity_id}", json=COMPOSITION
    )

    assert response.status_code == 201
    assert response.json() == {
        "itinerary_id": itinerary_id,
        "activity_id": activity_id,
        **COMPOSITION,
    }


def test_create_composition_returns_403_for_another_guide(
    client, as_user, create_itinerary, create_activity
):
    itinerary_id = create_itinerary()
    activity_id = create_activity()
    other_guide_id = client.post(
        "/api/users",
        json={
            "name": "Gus",
            "role": "guide",
            "email": "gus@example.com",
            "password": "x",
            "specialty": "Art",
        },
    ).json()["id"]

    with as_user(other_guide_id):
        response = client.post(
            f"/api/itineraries/{itinerary_id}/activities/{activity_id}", json=COMPOSITION
        )

    assert response.status_code == 403


def test_create_composition_twice_returns_409(client, create_itinerary, create_activity):
    itinerary_id = create_itinerary()
    activity_id = create_activity()
    url = f"/api/itineraries/{itinerary_id}/activities/{activity_id}"
    client.post(url, json=COMPOSITION)

    response = client.post(url, json=COMPOSITION)

    assert response.status_code == 409


@pytest.mark.parametrize("field", ["order", "day"])
def test_create_composition_returns_422_when_value_not_positive(
    client, field, create_itinerary, create_activity
):
    itinerary_id = create_itinerary()
    activity_id = create_activity()

    response = client.post(
        f"/api/itineraries/{itinerary_id}/activities/{activity_id}",
        json={**COMPOSITION, field: 0},
    )

    assert response.status_code == 422


def test_create_composition_returns_404_when_itinerary_missing(client, create_activity):
    activity_id = create_activity()

    response = client.post(f"/api/itineraries/999999/activities/{activity_id}", json=COMPOSITION)

    assert response.status_code == 404


def test_create_composition_returns_404_when_activity_missing(client, create_itinerary):
    itinerary_id = create_itinerary()

    response = client.post(f"/api/itineraries/{itinerary_id}/activities/999999", json=COMPOSITION)

    assert response.status_code == 404


def test_update_composition_reschedules_the_activity(client, create_itinerary, create_activity):
    itinerary_id = create_itinerary()
    activity_id = create_activity()
    url = f"/api/itineraries/{itinerary_id}/activities/{activity_id}"
    client.post(url, json=COMPOSITION)

    response = client.patch(url, json={"day": 2, "start_time": "15:30:00"})

    assert response.status_code == 200
    body = response.json()
    assert body["day"] == 2
    assert body["start_time"] == "15:30:00"
    assert body["order"] == 1


def test_update_composition_returns_404_when_missing(client, create_itinerary, create_activity):
    itinerary_id = create_itinerary()
    activity_id = create_activity()

    response = client.patch(
        f"/api/itineraries/{itinerary_id}/activities/{activity_id}", json={"day": 2}
    )

    assert response.status_code == 404


def test_list_compositions_returns_the_activities_in_order(
    client, create_itinerary, create_activity
):
    itinerary_id = create_itinerary()
    museum = create_activity("Museum")
    hike = create_activity("Hike")
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


def test_delete_composition_returns_204(client, create_itinerary, create_activity):
    itinerary_id = create_itinerary()
    activity_id = create_activity()
    client.post(f"/api/itineraries/{itinerary_id}/activities/{activity_id}", json=COMPOSITION)

    response = client.delete(f"/api/itineraries/{itinerary_id}/activities/{activity_id}")

    assert response.status_code == 204
    assert client.get(f"/api/itineraries/{itinerary_id}/activities").json() == []


def test_delete_composition_returns_404_when_missing(client, create_itinerary, create_activity):
    itinerary_id = create_itinerary()
    activity_id = create_activity()

    response = client.delete(f"/api/itineraries/{itinerary_id}/activities/{activity_id}")

    assert response.status_code == 404

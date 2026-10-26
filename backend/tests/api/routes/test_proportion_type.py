"""Tests for the proportion type routes."""

import pytest


def _create_itinerary(client) -> int:
    return client.post(
        "/api/itineraries",
        json={"creation_date": "2026-01-01", "activity_count": 4},
    ).json()["id"]


def _create_activity_type(client, code="visit") -> str:
    return client.post(
        "/api/activity-types", json={"code": code, "name": code.title()}
    ).json()["code"]


def test_create_proportion_type_returns_201(client):
    itinerary_id = _create_itinerary(client)
    code = _create_activity_type(client)

    response = client.post(
        f"/api/itineraries/{itinerary_id}/proportion-types/{code}", json={"value": 40}
    )

    assert response.status_code == 201
    assert response.json() == {
        "itinerary_id": itinerary_id,
        "activity_type_code": code,
        "value": 40,
    }


def test_create_proportion_type_twice_returns_409(client):
    itinerary_id = _create_itinerary(client)
    code = _create_activity_type(client)
    url = f"/api/itineraries/{itinerary_id}/proportion-types/{code}"
    client.post(url, json={"value": 40})

    response = client.post(url, json={"value": 60})

    assert response.status_code == 409


@pytest.mark.parametrize("value", [-1, 101])
def test_create_proportion_type_returns_422_when_value_out_of_range(client, value):
    itinerary_id = _create_itinerary(client)
    code = _create_activity_type(client)

    response = client.post(
        f"/api/itineraries/{itinerary_id}/proportion-types/{code}", json={"value": value}
    )

    assert response.status_code == 422


def test_create_proportion_type_returns_404_when_itinerary_missing(client):
    code = _create_activity_type(client)

    response = client.post(
        f"/api/itineraries/999999/proportion-types/{code}", json={"value": 40}
    )

    assert response.status_code == 404


def test_create_proportion_type_returns_404_when_activity_type_missing(client):
    itinerary_id = _create_itinerary(client)

    response = client.post(
        f"/api/itineraries/{itinerary_id}/proportion-types/missing", json={"value": 40}
    )

    assert response.status_code == 404


def test_update_proportion_type_changes_the_value(client):
    itinerary_id = _create_itinerary(client)
    code = _create_activity_type(client)
    url = f"/api/itineraries/{itinerary_id}/proportion-types/{code}"
    client.post(url, json={"value": 40})

    response = client.patch(url, json={"value": 60})

    assert response.status_code == 200
    assert response.json()["value"] == 60


@pytest.mark.parametrize("value", [-1, 101])
def test_update_proportion_type_returns_422_when_value_out_of_range(client, value):
    itinerary_id = _create_itinerary(client)
    code = _create_activity_type(client)
    url = f"/api/itineraries/{itinerary_id}/proportion-types/{code}"
    client.post(url, json={"value": 40})

    response = client.patch(url, json={"value": value})

    assert response.status_code == 422


def test_update_proportion_type_returns_404_when_missing(client):
    itinerary_id = _create_itinerary(client)
    code = _create_activity_type(client)

    response = client.patch(
        f"/api/itineraries/{itinerary_id}/proportion-types/{code}", json={"value": 60}
    )

    assert response.status_code == 404


def test_list_proportion_types_returns_the_itinerary_ones(client):
    itinerary_id = _create_itinerary(client)
    visit = _create_activity_type(client, "visit")
    workshop = _create_activity_type(client, "workshop")
    client.post(f"/api/itineraries/{itinerary_id}/proportion-types/{visit}", json={"value": 70})
    client.post(
        f"/api/itineraries/{itinerary_id}/proportion-types/{workshop}", json={"value": 30}
    )

    response = client.get(f"/api/itineraries/{itinerary_id}/proportion-types")

    assert response.status_code == 200
    assert {p["activity_type_code"]: p["value"] for p in response.json()} == {
        visit: 70,
        workshop: 30,
    }


def test_list_proportion_types_returns_404_when_itinerary_missing(client):
    response = client.get("/api/itineraries/999999/proportion-types")

    assert response.status_code == 404


def test_delete_proportion_type_returns_204(client):
    itinerary_id = _create_itinerary(client)
    code = _create_activity_type(client)
    client.post(f"/api/itineraries/{itinerary_id}/proportion-types/{code}", json={"value": 40})

    response = client.delete(f"/api/itineraries/{itinerary_id}/proportion-types/{code}")

    assert response.status_code == 204
    assert client.get(f"/api/itineraries/{itinerary_id}/proportion-types").json() == []


def test_delete_proportion_type_returns_404_when_missing(client):
    itinerary_id = _create_itinerary(client)
    code = _create_activity_type(client)

    response = client.delete(f"/api/itineraries/{itinerary_id}/proportion-types/{code}")

    assert response.status_code == 404

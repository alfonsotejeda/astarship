"""Tests for the proportion category routes."""

import pytest


def _create_itinerary(client) -> int:
    return client.post(
        "/api/itineraries",
        json={"creation_date": "2026-01-01", "activity_count": 4, "validated": False},
    ).json()["id"]


def _create_category(client, name="Culture") -> int:
    return client.post("/api/categories/create", json={"name": name}).json()["id"]


def test_create_proportion_category_returns_201(client):
    itinerary_id = _create_itinerary(client)
    category_id = _create_category(client)

    response = client.post(
        f"/api/itineraries/{itinerary_id}/proportion-categories/{category_id}",
        json={"value": 40},
    )

    assert response.status_code == 201
    assert response.json() == {
        "itinerary_id": itinerary_id,
        "category_id": category_id,
        "value": 40,
    }


def test_create_proportion_category_twice_returns_409(client):
    itinerary_id = _create_itinerary(client)
    category_id = _create_category(client)
    url = f"/api/itineraries/{itinerary_id}/proportion-categories/{category_id}"
    client.post(url, json={"value": 40})

    response = client.post(url, json={"value": 60})

    assert response.status_code == 409


@pytest.mark.parametrize("value", [-1, 101])
def test_create_proportion_category_returns_422_when_value_out_of_range(client, value):
    itinerary_id = _create_itinerary(client)
    category_id = _create_category(client)

    response = client.post(
        f"/api/itineraries/{itinerary_id}/proportion-categories/{category_id}",
        json={"value": value},
    )

    assert response.status_code == 422


def test_create_proportion_category_returns_404_when_itinerary_missing(client):
    category_id = _create_category(client)

    response = client.post(
        f"/api/itineraries/999999/proportion-categories/{category_id}", json={"value": 40}
    )

    assert response.status_code == 404


def test_create_proportion_category_returns_404_when_category_missing(client):
    itinerary_id = _create_itinerary(client)

    response = client.post(
        f"/api/itineraries/{itinerary_id}/proportion-categories/999999", json={"value": 40}
    )

    assert response.status_code == 404


def test_update_proportion_category_changes_the_value(client):
    itinerary_id = _create_itinerary(client)
    category_id = _create_category(client)
    url = f"/api/itineraries/{itinerary_id}/proportion-categories/{category_id}"
    client.post(url, json={"value": 40})

    response = client.patch(url, json={"value": 60})

    assert response.status_code == 200
    assert response.json()["value"] == 60


@pytest.mark.parametrize("value", [-1, 101])
def test_update_proportion_category_returns_422_when_value_out_of_range(client, value):
    itinerary_id = _create_itinerary(client)
    category_id = _create_category(client)
    url = f"/api/itineraries/{itinerary_id}/proportion-categories/{category_id}"
    client.post(url, json={"value": 40})

    response = client.patch(url, json={"value": value})

    assert response.status_code == 422


def test_update_proportion_category_returns_404_when_missing(client):
    itinerary_id = _create_itinerary(client)
    category_id = _create_category(client)

    response = client.patch(
        f"/api/itineraries/{itinerary_id}/proportion-categories/{category_id}",
        json={"value": 60},
    )

    assert response.status_code == 404


def test_list_proportion_categories_returns_the_itinerary_ones(client):
    itinerary_id = _create_itinerary(client)
    culture = _create_category(client, "Culture")
    nature = _create_category(client, "Nature")
    url = f"/api/itineraries/{itinerary_id}/proportion-categories"
    client.post(f"{url}/{culture}", json={"value": 70})
    client.post(f"{url}/{nature}", json={"value": 30})

    response = client.get(url)

    assert response.status_code == 200
    assert {p["category_id"]: p["value"] for p in response.json()} == {culture: 70, nature: 30}


def test_list_proportion_categories_returns_404_when_itinerary_missing(client):
    response = client.get("/api/itineraries/999999/proportion-categories")

    assert response.status_code == 404


def test_delete_proportion_category_returns_204(client):
    itinerary_id = _create_itinerary(client)
    category_id = _create_category(client)
    url = f"/api/itineraries/{itinerary_id}/proportion-categories/{category_id}"
    client.post(url, json={"value": 40})

    response = client.delete(url)

    assert response.status_code == 204
    assert client.get(f"/api/itineraries/{itinerary_id}/proportion-categories").json() == []


def test_delete_proportion_category_returns_404_when_missing(client):
    itinerary_id = _create_itinerary(client)
    category_id = _create_category(client)

    response = client.delete(
        f"/api/itineraries/{itinerary_id}/proportion-categories/{category_id}"
    )

    assert response.status_code == 404

"""Tests for the itinerary routes."""


def test_create_itinerary_returns_201(client):
    response = client.post(
        "/api/itineraries",
        json={"creation_date": "2026-01-01", "activity_count": 2, "validated": False},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["creation_date"] == "2026-01-01"
    assert body["activity_count"] == 2
    assert body["validated"] is False
    assert "id" in body


def test_list_itineraries_includes_created_itinerary(client):
    client.post(
        "/api/itineraries",
        json={"creation_date": "2026-01-01", "activity_count": 2, "validated": False},
    )

    response = client.get("/api/itineraries")

    assert response.status_code == 200
    assert any(i["activity_count"] == 2 for i in response.json())


def test_get_itinerary_returns_404_when_missing(client):
    response = client.get("/api/itineraries/999")

    assert response.status_code == 404


def test_update_itinerary_changes_validated(client):
    created = client.post(
        "/api/itineraries",
        json={"creation_date": "2026-01-01", "activity_count": 2, "validated": False},
    ).json()

    response = client.patch(f"/api/itineraries/{created['id']}", json={"validated": True})

    assert response.status_code == 200
    assert response.json()["validated"] is True


def test_delete_itinerary_removes_it(client):
    created = client.post(
        "/api/itineraries",
        json={"creation_date": "2026-01-01", "activity_count": 1, "validated": False},
    ).json()

    response = client.delete(f"/api/itineraries/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/itineraries/{created['id']}").status_code == 404

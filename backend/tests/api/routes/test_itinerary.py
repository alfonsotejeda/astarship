"""Tests for the itinerary routes."""


def test_create_itinerary_returns_201(client):
    response = client.post(
        "/api/itineraries",
        json={"creation_date": "2026-01-01", "activity_count": 2},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["creation_date"] == "2026-01-01"
    assert body["activity_count"] == 2
    assert body["status"] == "pending"
    assert "id" in body


def test_list_itineraries_includes_created_itinerary(client):
    client.post(
        "/api/itineraries",
        json={"creation_date": "2026-01-01", "activity_count": 2},
    )

    response = client.get("/api/itineraries")

    assert response.status_code == 200
    assert any(i["activity_count"] == 2 for i in response.json())


def test_get_itinerary_returns_404_when_missing(client):
    response = client.get("/api/itineraries/999")

    assert response.status_code == 404


def test_update_itinerary_changes_status(client):
    created = client.post(
        "/api/itineraries",
        json={"creation_date": "2026-01-01", "activity_count": 2},
    ).json()

    response = client.patch(f"/api/itineraries/{created['id']}", json={"status": "validated"})

    assert response.status_code == 200
    assert response.json()["status"] == "validated"


def test_delete_itinerary_removes_it(client):
    created = client.post(
        "/api/itineraries",
        json={"creation_date": "2026-01-01", "activity_count": 1},
    ).json()

    response = client.delete(f"/api/itineraries/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/itineraries/{created['id']}").status_code == 404


def test_list_itineraries_filters_by_status(client):
    payload = {"creation_date": "2026-01-01", "activity_count": 1}
    validated = client.post("/api/itineraries", json=payload).json()
    client.post("/api/itineraries", json=payload)
    client.patch(f"/api/itineraries/{validated['id']}", json={"status": "validated"})

    response = client.get("/api/itineraries", params={"status": "validated"})

    assert response.status_code == 200
    assert [i["id"] for i in response.json()] == [validated["id"]]

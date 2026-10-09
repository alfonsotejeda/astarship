"""Tests for the travel group routes."""


def test_create_travel_group_returns_201(client):
    response = client.post(
        "/api/travel-groups",
        json={"name": "Backpackers"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Backpackers"
    assert "id" in body


def test_list_travel_groups_includes_created_travel_group(client):
    client.post("/api/travel-groups", json={"name": "Backpackers"})

    response = client.get("/api/travel-groups")

    assert response.status_code == 200
    assert any(g["name"] == "Backpackers" for g in response.json())


def test_get_travel_group_returns_404_when_missing(client):
    response = client.get("/api/travel-groups/999")

    assert response.status_code == 404


def test_update_travel_group_changes_name(client):
    created = client.post("/api/travel-groups", json={"name": "Old"}).json()

    response = client.patch(f"/api/travel-groups/{created['id']}", json={"name": "New"})

    assert response.status_code == 200
    assert response.json()["name"] == "New"


def test_delete_travel_group_removes_it(client):
    created = client.post("/api/travel-groups", json={"name": "Temp"}).json()

    response = client.delete(f"/api/travel-groups/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/travel-groups/{created['id']}").status_code == 404

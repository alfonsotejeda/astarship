"""Tests for the travel group routes."""


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


def _create_travel_group(client, guide_id, name="Backpackers") -> dict:
    return client.post(
        "/api/travel-groups", json={"name": name, "guide_id": guide_id}
    ).json()


def test_create_travel_group_returns_201(client):
    guide_id = _create_guide(client)

    response = client.post(
        "/api/travel-groups",
        json={"name": "Backpackers", "guide_id": guide_id},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Backpackers"
    assert body["guide_id"] == guide_id
    assert "id" in body


def test_create_travel_group_without_guide_returns_422(client):
    response = client.post("/api/travel-groups", json={"name": "Backpackers"})

    assert response.status_code == 422


def test_create_travel_group_with_missing_guide_returns_404(client):
    response = client.post("/api/travel-groups", json={"name": "Backpackers", "guide_id": 999})

    assert response.status_code == 404


def test_create_travel_group_with_non_guide_user_returns_404(client):
    tourist_id = client.post(
        "/api/users",
        json={
            "name": "Ada",
            "role": "tourist",
            "email": "ada@example.com",
            "password": "x",
            "age": 30,
        },
    ).json()["id"]

    response = client.post(
        "/api/travel-groups", json={"name": "Backpackers", "guide_id": tourist_id}
    )

    assert response.status_code == 404


def test_list_travel_groups_includes_created_travel_group(client):
    _create_travel_group(client, _create_guide(client))

    response = client.get("/api/travel-groups")

    assert response.status_code == 200
    assert any(g["name"] == "Backpackers" for g in response.json())


def test_get_travel_group_returns_404_when_missing(client):
    response = client.get("/api/travel-groups/999")

    assert response.status_code == 404


def test_update_travel_group_changes_name(client):
    created = _create_travel_group(client, _create_guide(client), "Old")

    response = client.patch(f"/api/travel-groups/{created['id']}", json={"name": "New"})

    assert response.status_code == 200
    assert response.json()["name"] == "New"


def test_delete_travel_group_removes_it(client):
    created = _create_travel_group(client, _create_guide(client), "Temp")

    response = client.delete(f"/api/travel-groups/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/travel-groups/{created['id']}").status_code == 404


def test_update_travel_group_changes_guide(client):
    created = _create_travel_group(client, _create_guide(client, "first@example.com"))
    second = _create_guide(client, "second@example.com")

    response = client.patch(f"/api/travel-groups/{created['id']}", json={"guide_id": second})

    assert response.status_code == 200
    assert response.json()["guide_id"] == second


def test_update_travel_group_with_missing_guide_returns_404(client):
    created = _create_travel_group(client, _create_guide(client))

    response = client.patch(f"/api/travel-groups/{created['id']}", json={"guide_id": 999})

    assert response.status_code == 404


def test_delete_guide_attending_travel_group_returns_409(client):
    guide_id = _create_guide(client)
    _create_travel_group(client, guide_id)

    response = client.delete(f"/api/users/{guide_id}")

    assert response.status_code == 409
    assert client.get(f"/api/users/{guide_id}").status_code == 200

"""Tests for the membership routes."""


def _create_tourist(client, email="ada@example.com") -> int:
    return client.post(
        "/api/users",
        json={"name": "Ada", "role": "tourist", "email": email, "password": "x", "age": 30},
    ).json()["id"]


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


def _create_travel_group(client, name="Backpackers") -> int:
    guide_id = _create_guide(client, f"{name.lower()}@example.com")
    return client.post(
        "/api/travel-groups", json={"name": name, "guide_id": guide_id}
    ).json()["id"]


def test_add_tourist_returns_201(client):
    tourist_id = _create_tourist(client)
    travel_group_id = _create_travel_group(client)

    response = client.post(f"/api/travel-groups/{travel_group_id}/tourists/{tourist_id}")

    assert response.status_code == 201
    assert response.json() == {"tourist_id": tourist_id, "travel_group_id": travel_group_id}


def test_tourist_lists_all_its_groups(client):
    tourist_id = _create_tourist(client)
    first = _create_travel_group(client, "First")
    second = _create_travel_group(client, "Second")
    client.post(f"/api/travel-groups/{first}/tourists/{tourist_id}")
    client.post(f"/api/travel-groups/{second}/tourists/{tourist_id}")

    response = client.get(f"/api/users/{tourist_id}")

    groups = response.json()["tourist"]["travel_groups"]
    assert {g["id"] for g in groups} == {first, second}


def test_add_tourist_twice_returns_409(client):
    tourist_id = _create_tourist(client)
    travel_group_id = _create_travel_group(client)
    client.post(f"/api/travel-groups/{travel_group_id}/tourists/{tourist_id}")

    response = client.post(f"/api/travel-groups/{travel_group_id}/tourists/{tourist_id}")

    assert response.status_code == 409


def test_add_tourist_returns_404_when_travel_group_missing(client):
    tourist_id = _create_tourist(client)

    response = client.post(f"/api/travel-groups/999999/tourists/{tourist_id}")

    assert response.status_code == 404


def test_add_tourist_returns_404_when_user_is_not_a_tourist(client):
    admin_id = client.post(
        "/api/users",
        json={"name": "Ana", "role": "admin", "email": "ana@example.com", "password": "x"},
    ).json()["id"]
    travel_group_id = _create_travel_group(client)

    response = client.post(f"/api/travel-groups/{travel_group_id}/tourists/{admin_id}")

    assert response.status_code == 404


def test_remove_tourist_returns_204(client):
    tourist_id = _create_tourist(client)
    travel_group_id = _create_travel_group(client)
    client.post(f"/api/travel-groups/{travel_group_id}/tourists/{tourist_id}")

    response = client.delete(f"/api/travel-groups/{travel_group_id}/tourists/{tourist_id}")

    assert response.status_code == 204
    assert client.get(f"/api/users/{tourist_id}").json()["tourist"]["travel_groups"] == []


def test_remove_tourist_returns_404_when_not_a_member(client):
    tourist_id = _create_tourist(client)
    travel_group_id = _create_travel_group(client)

    response = client.delete(f"/api/travel-groups/{travel_group_id}/tourists/{tourist_id}")

    assert response.status_code == 404

"""Tests for the authorization routes."""


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


def _create_package(client, name="Andes") -> int:
    return client.post("/api/packages", json={"name": name, "destination": "Peru"}).json()["id"]


def test_put_authorization_creates_it_with_201(client):
    guide_id = _create_guide(client)
    package_id = _create_package(client)

    response = client.put(
        f"/api/packages/{package_id}/authorizations/{guide_id}",
        json={"can_generate": True, "can_validate": False},
    )

    assert response.status_code == 201
    assert response.json() == {
        "guide_id": guide_id,
        "package_id": package_id,
        "can_generate": True,
        "can_validate": False,
    }


def test_put_authorization_twice_replaces_the_flags(client):
    guide_id = _create_guide(client)
    package_id = _create_package(client)
    url = f"/api/packages/{package_id}/authorizations/{guide_id}"
    client.put(url, json={"can_generate": True, "can_validate": False})

    response = client.put(url, json={"can_generate": False, "can_validate": True})

    assert response.status_code == 200
    assert response.json()["can_generate"] is False
    assert response.json()["can_validate"] is True


def test_put_authorization_returns_404_when_package_missing(client):
    guide_id = _create_guide(client)

    response = client.put(f"/api/packages/999999/authorizations/{guide_id}", json={})

    assert response.status_code == 404


def test_put_authorization_returns_404_when_user_is_not_a_guide(client):
    admin_id = client.post(
        "/api/users",
        json={"name": "Ana", "role": "admin", "email": "ana@example.com", "password": "x"},
    ).json()["id"]
    package_id = _create_package(client)

    response = client.put(f"/api/packages/{package_id}/authorizations/{admin_id}", json={})

    assert response.status_code == 404


def test_list_authorizations_returns_the_package_guides(client):
    first = _create_guide(client, "a@example.com")
    second = _create_guide(client, "b@example.com")
    package_id = _create_package(client)
    client.put(f"/api/packages/{package_id}/authorizations/{first}", json={})
    client.put(f"/api/packages/{package_id}/authorizations/{second}", json={})

    response = client.get(f"/api/packages/{package_id}/authorizations")

    assert response.status_code == 200
    assert {a["guide_id"] for a in response.json()} == {first, second}


def test_list_authorizations_returns_404_when_package_missing(client):
    response = client.get("/api/packages/999999/authorizations")

    assert response.status_code == 404


def test_delete_authorization_returns_204(client):
    guide_id = _create_guide(client)
    package_id = _create_package(client)
    client.put(f"/api/packages/{package_id}/authorizations/{guide_id}", json={})

    response = client.delete(f"/api/packages/{package_id}/authorizations/{guide_id}")

    assert response.status_code == 204
    assert client.get(f"/api/packages/{package_id}/authorizations").json() == []


def test_delete_authorization_returns_404_when_missing(client):
    guide_id = _create_guide(client)
    package_id = _create_package(client)

    response = client.delete(f"/api/packages/{package_id}/authorizations/{guide_id}")

    assert response.status_code == 404

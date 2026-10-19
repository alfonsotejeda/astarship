"""Tests for the user routes."""


def _create_user(client, email="ada@example.com"):
    return client.post(
        "/api/users",
        json={"name": "Ada", "role": "tourist", "email": email, "password": "s3cret"},
    ).json()


def test_create_user_returns_201(client):
    response = client.post(
        "/api/users",
        json={"name": "Ada", "role": "admin", "email": "ada@example.com", "password": "s3cret"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "ada@example.com"
    assert body["role"] == "admin"
    assert "password" not in body
    assert "password_hash" not in body


def test_create_tourist_returns_its_subtype_fields(client):
    response = client.post(
        "/api/users",
        json={
            "name": "Ada",
            "role": "tourist",
            "email": "ada@example.com",
            "password": "x",
            "age": 30,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "tourist"
    assert body["tourist"] == {"age": 30, "travel_groups": []}
    assert body["guide"] is None


def test_create_guide_without_specialty_returns_422(client):
    response = client.post(
        "/api/users",
        json={"name": "Gil", "role": "guide", "email": "gil@example.com", "password": "x"},
    )

    assert response.status_code == 422


def test_list_users_includes_created_user(client):
    client.post(
        "/api/users",
        json={"name": "Ada", "role": "admin", "email": "ada@example.com", "password": "x"},
    )

    response = client.get("/api/users")

    assert response.status_code == 200
    assert any(u["email"] == "ada@example.com" for u in response.json())


def test_get_user_returns_404_when_missing(client):
    response = client.get("/api/users/999999")

    assert response.status_code == 404


def test_update_user_changes_name(client):
    created = client.post(
        "/api/users",
        json={"name": "Old", "role": "admin", "email": "old@example.com", "password": "x"},
    ).json()

    response = client.patch(f"/api/users/{created['id']}", json={"name": "New"})

    assert response.status_code == 200
    assert response.json()["name"] == "New"


def test_update_user_rejects_fields_of_other_roles(client):
    created = client.post(
        "/api/users",
        json={"name": "Old", "role": "admin", "email": "old@example.com", "password": "x"},
    ).json()

    response = client.patch(f"/api/users/{created['id']}", json={"guide": {"specialty": "History"}})

    assert response.status_code == 422


def test_delete_user_removes_it(client):
    created = client.post(
        "/api/users",
        json={"name": "Temp", "role": "admin", "email": "temp@example.com", "password": "x"},
    ).json()

    response = client.delete(f"/api/users/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/users/{created['id']}").status_code == 404


def _create_package(client, name="Europa Capitales", destination="París"):
    return client.post(
        "/api/packages", json={"name": name, "destination": destination}
    ).json()


def _create_booking(client, user_id, package_id):
    return client.post(
        "/api/bookings", json={"user_id": user_id, "package_id": package_id}
    )


def test_get_user_packages_returns_booked_packages(client):
    user = _create_user(client, email="userpkgs@example.com")
    package = _create_package(client)
    _create_booking(client, user["id"], package["id"])

    response = client.get(f"/api/users/{user['id']}/packages")

    assert response.status_code == 200
    assert any(p["name"] == package["name"] for p in response.json())


def test_get_user_packages_returns_404_when_user_missing(client):
    response = client.get("/api/users/999999/packages")

    assert response.status_code == 404


def test_get_user_packages_empty_when_no_bookings(client):
    user = _create_user(client, email="nobookings@example.com")

    response = client.get(f"/api/users/{user['id']}/packages")

    assert response.status_code == 200
    assert response.json() == []

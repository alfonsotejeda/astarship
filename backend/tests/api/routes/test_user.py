"""Tests for the user routes."""


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


def test_create_user_with_existing_email_returns_409(client):
    payload = {"name": "Ada", "role": "admin", "email": "ada@example.com", "password": "s3cret"}
    client.post("/api/users", json=payload)

    response = client.post("/api/users", json=payload)

    assert response.status_code == 409


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


def test_delete_admin_with_packages_returns_409(client):
    admin = client.post(
        "/api/users",
        json={"name": "Ada", "role": "admin", "email": "ada@example.com", "password": "x"},
    ).json()
    client.post(
        "/api/packages", json={"name": "Andes", "destination": "Peru", "admin_id": admin["id"]}
    )

    response = client.delete(f"/api/users/{admin['id']}")

    assert response.status_code == 409
    assert client.get(f"/api/users/{admin['id']}").status_code == 200

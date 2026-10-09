"""Tests for the user routes."""


def test_create_user_returns_201(client):
    response = client.post(
        "/api/users",
        json={"name": "Ada", "role": "tourist", "email": "ada@example.com", "password": "s3cret"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "ada@example.com"
    assert "password" not in body
    assert "password_hash" not in body


def test_list_users_includes_created_user(client):
    client.post(
        "/api/users",
        json={"name": "Ada", "role": "tourist", "email": "ada@example.com", "password": "x"},
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
        json={"name": "Old", "role": "tourist", "email": "old@example.com", "password": "x"},
    ).json()

    response = client.patch(f"/api/users/{created['id']}", json={"name": "New"})

    assert response.status_code == 200
    assert response.json()["name"] == "New"


def test_delete_user_removes_it(client):
    created = client.post(
        "/api/users",
        json={"name": "Temp", "role": "tourist", "email": "temp@example.com", "password": "x"},
    ).json()

    response = client.delete(f"/api/users/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/users/{created['id']}").status_code == 404

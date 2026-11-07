"""Tests for the auth routes."""

import pytest

from app.core.security import create_access_token


@pytest.fixture
def client(anonymous_client):
    """These tests exercise the real token check, so no user is faked."""
    return anonymous_client


def _create_user(client, **overrides):
    payload = {"name": "Ada", "role": "admin", "email": "ada@example.com", "password": "s3cret"}
    payload.update(overrides)
    return client.post("/api/users", json=payload).json()


def _login(client, email="ada@example.com", password="s3cret"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def _auth_header(token):
    return {"Authorization": f"Bearer {token}"}


def test_login_returns_bearer_token(client):
    _create_user(client)

    response = _login(client)

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_with_wrong_password_returns_401(client):
    _create_user(client)

    response = _login(client, password="wrong")

    assert response.status_code == 401


def test_login_with_unknown_email_returns_401(client):
    response = _login(client, email="nobody@example.com")

    assert response.status_code == 401


def test_me_without_token_returns_401(client):
    response = client.get("/api/auth/me")

    assert response.status_code == 401


def test_me_with_invalid_token_returns_401(client):
    response = client.get("/api/auth/me", headers=_auth_header("not-a-token"))

    assert response.status_code == 401


def test_me_with_token_of_deleted_user_returns_401(client):
    created = _create_user(client)
    token = create_access_token(created["id"])
    client.delete(f"/api/users/{created['id']}", headers=_auth_header(token))

    response = client.get("/api/auth/me", headers=_auth_header(token))

    assert response.status_code == 401


def test_me_returns_current_user_and_role(client):
    created = _create_user(client)
    token = _login(client).json()["access_token"]

    response = client.get("/api/auth/me", headers=_auth_header(token))

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created["id"]
    assert body["role"] == "admin"
    assert body["guide"] is None
    assert "password_hash" not in body


def test_me_returns_guide_authorizations(client):
    guide = _create_user(client, role="guide", specialty="History")
    admin = _create_user(client, name="Grace", email="grace@example.com")
    admin_headers = _auth_header(create_access_token(admin["id"]))
    package = client.post(
        "/api/packages",
        json={"name": "Rutas del Sur", "destination": "Sevilla", "admin_id": admin["id"]},
        headers=admin_headers,
    ).json()
    client.put(
        f"/api/authorizations/packages/{package['id']}/guides/{guide['id']}",
        json={"can_generate": True},
        headers=admin_headers,
    )
    token = _login(client).json()["access_token"]

    response = client.get("/api/auth/me", headers=_auth_header(token))

    assert response.status_code == 200
    body = response.json()
    assert body["role"] == "guide"
    assert body["guide"]["specialty"] == "History"
    assert body["guide"]["authorizations"] == [
        {
            "guide_id": guide["id"],
            "package_id": package["id"],
            "can_generate": True,
            "can_validate": False,
        }
    ]

"""Tests for the authentication dependencies."""

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.deps.auth import require_admin, require_role
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user.user import User, UserRole

app = FastAPI()


@app.get("/admin-only")
def admin_only(user: User = Depends(require_admin)) -> dict[str, int]:
    return {"id": user.id}


@app.get("/staff")
def staff(
    user: User = Depends(require_role(UserRole.ADMIN, UserRole.OPERATIONS_MANAGER)),
) -> dict[str, int]:
    return {"id": user.id}


@pytest.fixture
def deps_client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def _auth(user):
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def test_require_role_without_token_returns_401(deps_client):
    assert deps_client.get("/admin-only").status_code == 401


def test_require_role_lets_matching_role_through(deps_client, users):
    response = deps_client.get("/admin-only", headers=_auth(users["admin"]))

    assert response.status_code == 200
    assert response.json() == {"id": users["admin"].id}


def test_require_role_rejects_other_role(deps_client, users):
    assert deps_client.get("/admin-only", headers=_auth(users["guide"])).status_code == 403


def test_require_role_accepts_any_of_several_roles(deps_client, users):
    assert deps_client.get("/staff", headers=_auth(users["admin"])).status_code == 200
    assert deps_client.get("/staff", headers=_auth(users["tourist"])).status_code == 403

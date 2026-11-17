"""Tests for the guide authorization dependencies."""

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.deps.authorization import require_can_generate, require_can_validate
from app.core.security import create_access_token
from app.db.session import get_db
from app.models.user.user import User
from app.schemas.authorization import AuthorizationUpsert
from app.services import authorization as authorization_service

app = FastAPI()


@app.get("/packages/{package_id}/generate")
def generate(user: User = Depends(require_can_generate)) -> None:
    return None


@app.get("/packages/{package_id}/validate")
def validate(user: User = Depends(require_can_validate)) -> None:
    return None


@pytest.fixture
def deps_client(db_session):
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


def _auth(user):
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def test_guide_authorized_rejects_non_guide(deps_client, users, package):
    response = deps_client.get(f"/packages/{package.id}/generate", headers=_auth(users["admin"]))

    assert response.status_code == 403


def test_guide_authorized_rejects_guide_without_authorization(deps_client, users, package):
    response = deps_client.get(f"/packages/{package.id}/generate", headers=_auth(users["guide"]))

    assert response.status_code == 403


def test_guide_authorized_checks_each_flag(deps_client, db_session, users, package):
    authorization_service.create_authorization(
        db_session, package.id, users["guide"].id, AuthorizationUpsert(can_generate=True)
    )
    headers = _auth(users["guide"])

    assert deps_client.get(f"/packages/{package.id}/generate", headers=headers).status_code == 200
    assert deps_client.get(f"/packages/{package.id}/validate", headers=headers).status_code == 403

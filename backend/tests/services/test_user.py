"""Tests for the user service."""

from app.schemas.user import UserCreate, UserUpdate
from app.services import user as user_service


def test_create_user_hashes_the_password(db_session):
    data = UserCreate(name="Ada", role="tourist", email="ada@example.com", password="s3cret")

    user = user_service.create_user(db_session, data)

    assert user.password_hash != "s3cret"


def test_get_user_returns_none_when_missing(db_session):
    assert user_service.get_user(db_session, 999) is None


def test_update_user_applies_partial_changes(db_session):
    user = user_service.create_user(
        db_session,
        UserCreate(name="Old", role="tourist", email="old@example.com", password="x"),
    )

    updated = user_service.update_user(db_session, user, UserUpdate(name="New"))

    assert updated.name == "New"
    assert updated.email == "old@example.com"


def test_delete_user_removes_it(db_session):
    user = user_service.create_user(
        db_session,
        UserCreate(name="Temp", role="tourist", email="temp@example.com", password="x"),
    )

    user_service.delete_user(db_session, user)

    assert user_service.get_user(db_session, user.id) is None

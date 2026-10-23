"""Tests for the user service."""

from app.models.user.admin import Admin
from app.models.user.tourist import Tourist
from app.models.user.user import UserRole
from app.schemas.user import (
    AdminCreate,
    GuideCreate,
    GuideUpdate,
    TouristCreate,
    TouristUpdate,
    UserUpdate,
)
from app.services import user as user_service


def _create_guide(db_session):
    return user_service.create_user(
        db_session,
        GuideCreate(
            name="Gil", role="guide", email="gil@example.com", password="x", specialty="History"
        ),
    )


def test_create_user_hashes_the_password(db_session):
    data = AdminCreate(name="Ada", role="admin", email="ada@example.com", password="s3cret")

    user = user_service.create_user(db_session, data)

    assert user.password_hash != "s3cret"


def test_create_user_creates_its_subtype_row(db_session):
    data = TouristCreate(name="Ada", role="tourist", email="ada@example.com", password="x", age=30)

    user = user_service.create_user(db_session, data)

    assert user.role == UserRole.TOURIST
    tourist = db_session.get(Tourist, user.id)
    assert tourist.age == 30
    assert tourist.travel_groups == []
    assert user.admin is None and user.guide is None and user.operations_manager is None


def test_get_user_returns_none_when_missing(db_session):
    assert user_service.get_user(db_session, 999) is None


def test_update_user_applies_partial_changes(db_session):
    user = user_service.create_user(
        db_session,
        AdminCreate(name="Old", role="admin", email="old@example.com", password="x"),
    )

    updated = user_service.update_user(db_session, user, UserUpdate(name="New"))

    assert updated.name == "New"
    assert updated.email == "old@example.com"


def test_update_user_changes_subtype_fields(db_session):
    user = _create_guide(db_session)

    updated = user_service.update_user(
        db_session, user, UserUpdate(guide=GuideUpdate(specialty="Nature"))
    )

    assert updated.guide.specialty == "Nature"


def test_update_user_ignores_null_subtype_fields(db_session):
    user = _create_guide(db_session)

    updated = user_service.update_user(
        db_session, user, UserUpdate(guide=GuideUpdate(specialty=None))
    )

    assert updated.guide.specialty == "History"


def test_foreign_subtypes_reports_other_roles(db_session):
    user = _create_guide(db_session)

    foreign = user_service.foreign_subtypes(
        user, UserUpdate(guide=GuideUpdate(), tourist=TouristUpdate(age=30))
    )

    assert foreign == ["tourist"]


def test_delete_user_removes_it_and_its_subtype(db_session):
    user = user_service.create_user(
        db_session,
        AdminCreate(name="Temp", role="admin", email="temp@example.com", password="x"),
    )

    user_service.delete_user(db_session, user)

    assert user_service.get_user(db_session, user.id) is None
    assert db_session.get(Admin, user.id) is None

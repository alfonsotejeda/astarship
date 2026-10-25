"""Tests for the authorization service."""

from app.schemas.authorization import AuthorizationUpsert
from app.schemas.package import PackageCreate
from app.schemas.user import GuideCreate
from app.services import authorization as authorization_service
from app.services import package as package_service
from app.services import user as user_service


def _create_guide(db_session, email="gil@example.com"):
    return user_service.create_user(
        db_session,
        GuideCreate(name="Gil", role="guide", email=email, password="x", specialty="History"),
    )


def _create_package(db_session, name="Andes"):
    return package_service.create_package(
        db_session, PackageCreate(name=name, destination="Peru")
    )


def test_create_authorization_stores_the_flags(db_session):
    user = _create_guide(db_session)
    package = _create_package(db_session)

    authorization = authorization_service.create_authorization(
        db_session, package.id, user.id, AuthorizationUpsert(can_generate=True)
    )

    assert authorization.guide_id == user.id
    assert authorization.package_id == package.id
    assert authorization.can_generate is True
    assert authorization.can_validate is False


def test_update_authorization_replaces_the_flags(db_session):
    user = _create_guide(db_session)
    package = _create_package(db_session)
    authorization = authorization_service.create_authorization(
        db_session, package.id, user.id, AuthorizationUpsert(can_generate=True)
    )

    authorization_service.update_authorization(
        db_session, authorization, AuthorizationUpsert(can_validate=True)
    )

    authorization = authorization_service.get_authorization(db_session, package.id, user.id)
    assert authorization.can_generate is False
    assert authorization.can_validate is True
    assert len(authorization_service.list_authorizations(db_session, package.id)) == 1


def test_list_authorizations_only_returns_the_package_ones(db_session):
    first_guide = _create_guide(db_session, "a@example.com")
    second_guide = _create_guide(db_session, "b@example.com")
    package = _create_package(db_session, "Andes")
    other = _create_package(db_session, "Amazon")
    authorization_service.create_authorization(
        db_session, package.id, first_guide.id, AuthorizationUpsert()
    )
    authorization_service.create_authorization(
        db_session, package.id, second_guide.id, AuthorizationUpsert()
    )
    authorization_service.create_authorization(
        db_session, other.id, first_guide.id, AuthorizationUpsert()
    )

    authorizations = authorization_service.list_authorizations(db_session, package.id)

    assert {a.guide_id for a in authorizations} == {first_guide.id, second_guide.id}


def test_list_guide_authorizations_only_returns_the_guide_ones(db_session):
    guide = _create_guide(db_session, "a@example.com")
    other_guide = _create_guide(db_session, "b@example.com")
    package = _create_package(db_session, "Andes")
    other = _create_package(db_session, "Amazon")
    authorization_service.create_authorization(
        db_session, package.id, guide.id, AuthorizationUpsert()
    )
    authorization_service.create_authorization(
        db_session, other.id, guide.id, AuthorizationUpsert()
    )
    authorization_service.create_authorization(
        db_session, package.id, other_guide.id, AuthorizationUpsert()
    )

    authorizations = authorization_service.list_guide_authorizations(db_session, guide.id)

    assert {a.package_id for a in authorizations} == {package.id, other.id}


def test_get_authorization_returns_none_when_missing(db_session):
    assert authorization_service.get_authorization(db_session, 999, 999) is None


def test_delete_authorization_revokes_it(db_session):
    user = _create_guide(db_session)
    package = _create_package(db_session)
    authorization = authorization_service.create_authorization(
        db_session, package.id, user.id, AuthorizationUpsert()
    )

    authorization_service.delete_authorization(db_session, authorization)

    assert authorization_service.get_authorization(db_session, package.id, user.id) is None


def test_deleting_the_guide_removes_its_authorizations(db_session):
    user = _create_guide(db_session)
    package = _create_package(db_session)
    authorization_service.create_authorization(
        db_session, package.id, user.id, AuthorizationUpsert()
    )

    user_service.delete_user(db_session, user)

    assert authorization_service.list_authorizations(db_session, package.id) == []


def test_deleting_the_package_removes_its_authorizations(db_session):
    user = _create_guide(db_session)
    package = _create_package(db_session)
    authorization_service.create_authorization(
        db_session, package.id, user.id, AuthorizationUpsert()
    )

    package_service.delete_package(db_session, package)

    assert authorization_service.get_authorization(db_session, package.id, user.id) is None

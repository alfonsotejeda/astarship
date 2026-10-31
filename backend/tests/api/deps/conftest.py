"""Fixtures shared by the dependency tests."""

import pytest

from app.schemas.package import PackageCreate
from app.schemas.user import AdminCreate, GuideCreate, TouristCreate
from app.services import package as package_service
from app.services import user as user_service


@pytest.fixture
def users(db_session):
    admin = user_service.create_user(
        db_session, AdminCreate(name="Ada", role="admin", email="ada@example.com", password="x")
    )
    guide = user_service.create_user(
        db_session,
        GuideCreate(
            name="Gil", role="guide", email="gil@example.com", password="x", specialty="History"
        ),
    )
    tourist = user_service.create_user(
        db_session,
        TouristCreate(name="Tom", role="tourist", email="tom@example.com", password="x", age=30),
    )
    return {"admin": admin, "guide": guide, "tourist": tourist}


@pytest.fixture
def package(db_session, users):
    return package_service.create_package(
        db_session, PackageCreate(name="Andes", destination="Peru", admin_id=users["admin"].id)
    )

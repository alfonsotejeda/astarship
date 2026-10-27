"""Shared pytest fixtures."""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.schemas.authorization import AuthorizationUpsert
from app.schemas.package import PackageCreate
from app.schemas.user import AdminCreate, GuideCreate
from app.services import authorization as authorization_service
from app.services import package as package_service
from app.services import user as user_service


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """In-memory SQLite session with a fresh schema for each test."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """TestClient with the database dependency pointed at the test session."""
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def itinerary_owners(db_session: Session) -> dict[str, int]:
    """Package and guide authorized to generate it, required to create an itinerary."""
    admin = user_service.create_user(
        db_session,
        AdminCreate(name="Owen", role="admin", email="owen@example.com", password="x"),
    )
    package = package_service.create_package(
        db_session, PackageCreate(name="Andes", destination="Peru", admin_id=admin.id)
    )
    guide = user_service.create_user(
        db_session,
        GuideCreate(
            name="Gil", role="guide", email="gil@example.com", password="x", specialty="History"
        ),
    )
    authorization_service.create_authorization(
        db_session, package.id, guide.id, AuthorizationUpsert(can_generate=True)
    )
    return {"package_id": package.id, "guide_id": guide.id}

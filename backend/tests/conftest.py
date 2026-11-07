"""Shared pytest fixtures."""

from collections.abc import Callable, Generator
from contextlib import AbstractContextManager, contextmanager
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps.auth import get_current_user
from app.models.activity import Activity
from app.models.activity_type import ActivityType
from app.models.attraction import Attraction
from app.models.category import Category
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.status import ItineraryStatus
from app.models.user.admin import Admin
from app.models.user.user import User
from app.schemas.authorization import AuthorizationUpsert
from app.schemas.itinerary import ItineraryCreate
from app.schemas.package import PackageCreate
from app.schemas.user import AdminCreate, GuideCreate
from app.services import authorization as authorization_service
from app.services import itinerary as itinerary_service
from app.services import package as package_service
from app.services import user as user_service


def pytest_configure() -> None:
    """Hash test passwords with the minimum bcrypt cost; the production one takes ~0.5 s each."""
    get_settings().bcrypt_rounds = 4


def _set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable foreign key enforcement on every SQLite connection of the test engine."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """In-memory SQLite session with a fresh schema for each test."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    event.listen(engine, "connect", _set_sqlite_pragma)
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _test_admin() -> User:
    """Admin that is never stored, so it doesn't show up in the data of a test."""
    return User(id=0, name="Root", email="root@example.com", password_hash="", admin=Admin(id=0))


@pytest.fixture
def anonymous_client(db_session: Session) -> Generator[TestClient, None, None]:
    """TestClient without credentials, with the database pointed at the test session."""
    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def client(anonymous_client: TestClient) -> TestClient:
    """TestClient authenticated as an admin; use `as_user` to call as someone else."""
    app.dependency_overrides[get_current_user] = _test_admin
    return anonymous_client


@pytest.fixture
def as_user(
    client: TestClient, db_session: Session
) -> Callable[[int], AbstractContextManager[None]]:
    """Return a context manager that makes the client call as the stored user with that id."""

    @contextmanager
    def acting_as(user_id: int) -> Generator[None, None, None]:
        app.dependency_overrides[get_current_user] = lambda: db_session.get(User, user_id)
        try:
            yield
        finally:
            app.dependency_overrides[get_current_user] = _test_admin

    return acting_as


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


@pytest.fixture
def approve_activity(client: TestClient):
    """Return a function that approves an activity through the validation endpoint."""
    reviewer: dict[str, int] = {}

    def approve(activity_id: int) -> None:
        if "id" not in reviewer:
            reviewer["id"] = client.post(
                "/api/users",
                json={
                    "name": "Reviewer",
                    "role": "admin",
                    "email": "reviewer@example.com",
                    "password": "x",
                },
            ).json()["id"]
        response = client.post(
            f"/api/activities/{activity_id}/validations",
            json={"admin_id": reviewer["id"], "result": "approved"},
        )
        assert response.status_code == 201

    return approve


@pytest.fixture
def create_itinerary(db_session: Session, itinerary_owners) -> Callable[..., int]:
    """Return a function that stores an itinerary of the authorized guide and returns its id."""

    def create(activity_count: int = 2, status: ItineraryStatus = ItineraryStatus.PENDING) -> int:
        data = ItineraryCreate(
            creation_date=date(2026, 1, 1), activity_count=activity_count, **itinerary_owners
        )
        itinerary = itinerary_service.create_itinerary(db_session, data)
        itinerary.status = status
        db_session.commit()
        return itinerary.id

    return create


@pytest.fixture
def insert_activity(db_session: Session) -> Callable[..., Activity]:
    """Return a function that stores an activity along with everything it references."""
    category = Category(name="Hiking routes")
    activity_type = ActivityType(code="hike", name="Hike")
    attraction = Attraction(name="Sierra", address="Road 1", latitude=20.0, longitude=-76.0)
    guide = user_service.create_user(
        db_session,
        GuideCreate(
            name="Hugo", role="guide", email="hugo@example.com", password="x", specialty="Trails"
        ),
    )
    db_session.add_all([category, activity_type, attraction])
    db_session.flush()

    def insert(name: str = "Hiking") -> Activity:
        activity = Activity(
            name=name,
            effort_level=3,
            duration=60,
            activity_type_code=activity_type.code,
            category_id=category.id,
            guide_id=guide.id,
            attraction_id=attraction.id,
        )
        db_session.add(activity)
        db_session.commit()
        return activity

    return insert

"""Shared pytest fixtures."""

from collections.abc import Callable, Generator
from contextlib import AbstractContextManager, contextmanager
from datetime import date, time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps.auth import get_current_user
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.activity import Activity
from app.models.activity_type import ActivityType
from app.models.assignment import Assignment
from app.models.attraction import Attraction
from app.models.category import Category
from app.models.itinerary_composition import ItineraryComposition
from app.models.membership import Membership
from app.models.status import ItineraryStatus, VisitStatus
from app.models.travel_group import TravelGroup
from app.models.user.admin import Admin
from app.models.user.user import User
from app.models.visit import Visit
from app.schemas.authorization import AuthorizationUpsert
from app.schemas.itinerary import ItineraryCreate
from app.schemas.package import PackageCreate
from app.schemas.user import AdminCreate, GuideCreate, TouristCreate
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


@pytest.fixture
def rc4_data(db_session, itinerary_owners):
    """Two itineraries, two travel groups and visits covering every RC-4 outcome.

    Ada and Ben belong to Alpha and are assigned to the first itinerary; Cleo belongs
    to Beta and is assigned to the second one. The three shared activities are one per
    effort band, so the report can be checked row by row, by effort and by filter.
    """
    package_id, guide_id = itinerary_owners["package_id"], itinerary_owners["guide_id"]
    admin_id = package_service.get_package(db_session, package_id).admin_id

    itineraries = [
        itinerary_service.create_itinerary(
            db_session,
            ItineraryCreate(
                creation_date=date(2026, 1, index + 1),
                activity_count=3,
                package_id=package_id,
                guide_id=guide_id,
            ),
        ).id
        for index in range(2)
    ]

    category = Category(name="RC4 routes")
    activity_type = ActivityType(code="rc4", name="RC4")
    attraction = Attraction(name="RC4 place", address="Road 1", latitude=20.0, longitude=-76.0)
    db_session.add_all([category, activity_type, attraction])
    db_session.flush()
    activities = {}
    for name, effort in (("Canyon", 1), ("Museum", 2), ("Peak", 3)):
        activity = Activity(
            name=name,
            effort_level=effort,
            duration=60,
            activity_type_code=activity_type.code,
            category_id=category.id,
            guide_id=guide_id,
            attraction_id=attraction.id,
        )
        db_session.add(activity)
        db_session.flush()
        activities[name] = activity

    for itinerary_id in itineraries:
        for order, activity in enumerate(activities.values(), start=1):
            db_session.add(
                ItineraryComposition(
                    itinerary_id=itinerary_id,
                    activity_id=activity.id,
                    order=order,
                    day=1,
                    start_time=time(hour=8 + order),
                )
            )

    alpha = TravelGroup(name="Alpha", guide_id=guide_id)
    beta = TravelGroup(name="Beta", guide_id=guide_id)
    db_session.add_all([alpha, beta])
    db_session.flush()

    tourists = {}
    for name, group, age in (("Ada", alpha, 30), ("Ben", alpha, 31), ("Cleo", beta, 32)):
        tourist = user_service.create_user(
            db_session,
            TouristCreate(
                name=name,
                role="tourist",
                email=f"{name.lower()}@example.com",
                password="x",
                age=age,
            ),
        )
        db_session.add(Membership(tourist_id=tourist.id, travel_group_id=group.id))
        tourists[name] = tourist

    for itinerary_id, tourist in (
        (itineraries[0], tourists["Ada"]),
        (itineraries[0], tourists["Ben"]),
        (itineraries[1], tourists["Cleo"]),
    ):
        db_session.add(
            Assignment(itinerary_id=itinerary_id, tourist_id=tourist.id, admin_id=admin_id)
        )
    db_session.commit()

    def add_visit(itinerary_index, tourist_name, activity_name, status, rating=None):
        visit = Visit(
            itinerary_id=itineraries[itinerary_index],
            tourist_id=tourists[tourist_name].id,
            activity_id=activities[activity_name].id,
            status=status,
            rating=rating,
        )
        db_session.add(visit)
        db_session.commit()
        return visit

    # Canyon (low) is always rated highly; Museum and Peak have skips and low ratings.
    add_visit(0, "Ada", "Canyon", VisitStatus.DONE, 5)
    add_visit(0, "Ben", "Canyon", VisitStatus.DONE, 4)
    add_visit(0, "Ada", "Museum", VisitStatus.DONE, 3)
    add_visit(0, "Ben", "Museum", VisitStatus.SKIPPED)
    add_visit(0, "Ada", "Peak", VisitStatus.DONE, 2)
    add_visit(0, "Ben", "Peak", VisitStatus.SKIPPED)
    add_visit(1, "Cleo", "Canyon", VisitStatus.DONE, 5)
    add_visit(1, "Cleo", "Museum", VisitStatus.SKIPPED)

    return {
        "itineraries": itineraries,
        "groups": {"alpha": alpha.id, "beta": beta.id},
        "activities": {name: activity.id for name, activity in activities.items()},
        "tourists": {name: tourist.id for name, tourist in tourists.items()},
        "add_visit": add_visit,
    }

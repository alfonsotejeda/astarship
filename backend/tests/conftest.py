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
from app.models.coverage import Coverage
from app.models.itinerary_composition import ItineraryComposition
from app.models.proportion_category import ProportionCategory
from app.models.proportion_type import ProportionType
from app.models.status import ItineraryStatus
from app.models.user.admin import Admin
from app.models.user.user import User
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
def rc5_data(db_session, itinerary_owners):
    """Two packages with three itineraries whose parametrization and coverage differ."""
    andes_id, guide_id = itinerary_owners["package_id"], itinerary_owners["guide_id"]
    admin_id = package_service.get_package(db_session, andes_id).admin_id
    alps_id = package_service.create_package(
        db_session, PackageCreate(name="Alps", destination="Swiss", admin_id=admin_id)
    ).id

    types = {
        code: ActivityType(code=code, name=name)
        for code, name in (("visita", "Visita"), ("excursion", "Excursión"), ("taller", "Taller"))
    }
    categories = {name: Category(name=name) for name in ("History", "Nature", "Art")}
    attraction = Attraction(name="RC5 place", address="Road 1", latitude=20.0, longitude=-76.0)
    db_session.add_all([*types.values(), *categories.values(), attraction])
    db_session.flush()
    for package_id, names in ((andes_id, ("History", "Nature")), (alps_id, ("Art",))):
        for name in names:
            db_session.add(Coverage(category_id=categories[name].id, package_id=package_id))

    activities = {}
    for name, code, category, effort in (
        ("Museum", "visita", "History", 1),
        ("Hike", "excursion", "Nature", 3),
        ("Workshop", "taller", "History", 2),
        ("Gallery", "visita", "Art", 1),
    ):
        activity = Activity(
            name=name,
            effort_level=effort,
            duration=60,
            activity_type_code=code,
            category_id=categories[category].id,
            guide_id=guide_id,
            attraction_id=attraction.id,
        )
        db_session.add(activity)
        db_session.flush()
        activities[name] = activity

    def create_itinerary(package_id, status, creation_date, activity_count):
        itinerary = itinerary_service.create_itinerary(
            db_session,
            ItineraryCreate(
                creation_date=creation_date,
                activity_count=activity_count,
                package_id=package_id,
                guide_id=guide_id,
            ),
        )
        itinerary.status = status
        db_session.commit()
        return itinerary.id

    def plan(itinerary_id, stops, type_values, category_values):
        for order, (name, start) in enumerate(stops, start=1):
            db_session.add(
                ItineraryComposition(
                    itinerary_id=itinerary_id,
                    activity_id=activities[name].id,
                    order=order,
                    day=1,
                    start_time=start,
                )
            )
        for code, value in type_values.items():
            db_session.add(
                ProportionType(itinerary_id=itinerary_id, activity_type_code=code, value=value)
            )
        for name, value in category_values.items():
            db_session.add(
                ProportionCategory(
                    itinerary_id=itinerary_id, category_id=categories[name].id, value=value
                )
            )

    first = create_itinerary(andes_id, ItineraryStatus.APPROVED, date(2026, 1, 10), 3)
    plan(
        first,
        [("Museum", time(9)), ("Hike", time(10)), ("Workshop", time(11))],
        {"visita": 33, "excursion": 33, "taller": 34},
        {"History": 67, "Nature": 33},
    )
    second = create_itinerary(alps_id, ItineraryStatus.PENDING, date(2026, 2, 10), 2)
    plan(
        second,
        [("Gallery", time(9)), ("Hike", time(18))],
        {"visita": 50, "excursion": 50},
        {"Art": 100},
    )
    third = create_itinerary(andes_id, ItineraryStatus.VALIDATED, date(2026, 3, 10), 1)
    plan(
        third,
        [("Museum", time(9))],
        {"visita": 100},
        {"History": 100, "Nature": 50},
    )

    tourist = user_service.create_user(
        db_session,
        TouristCreate(name="Ada", role="tourist", email="ada@example.com", password="x", age=30),
    )
    db_session.add(Assignment(itinerary_id=third, tourist_id=tourist.id, admin_id=admin_id))
    db_session.commit()

    return {
        "packages": {"andes": andes_id, "alps": alps_id},
        "categories": {name: category.id for name, category in categories.items()},
        "itineraries": {"first": first, "second": second, "third": third},
    }

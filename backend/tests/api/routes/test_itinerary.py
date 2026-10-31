"""Tests for the itinerary routes."""

import pytest

from app.models.status import ReviewStatus
from app.schemas.activity import ActivityCreate, ActivityUpdate
from app.schemas.activity_type import ActivityTypeCreate
from app.schemas.category import CategoryCreate
from app.services import activity as activity_service
from app.services import activity_type as activity_type_service
from app.services import category as category_service


def _create_guide(client, email="gil@example.com") -> int:
    return client.post(
        "/api/users",
        json={
            "name": "Gil",
            "role": "guide",
            "email": email,
            "password": "x",
            "specialty": "History",
        },
    ).json()["id"]


def _create_package(client, admin_id, name="Andes", approved=True) -> int:
    package_id = client.post(
        "/api/packages", json={"name": name, "destination": "Peru", "admin_id": admin_id}
    ).json()["id"]
    if approved:
        client.patch(f"/api/packages/{package_id}", json={"status": "approved"})
    return package_id


def _authorize(client, package_id, guide_id, can_generate=True) -> None:
    client.put(
        f"/api/authorizations/packages/{package_id}/guides/{guide_id}",
        json={"can_generate": can_generate, "can_validate": False},
    )


def _create_activity(
    db_session, name, type_code, category_id, effort_level, duration, approved=True
) -> int:
    activity = activity_service.create_activity(
        db_session,
        ActivityCreate(
            name=name,
            effort_level=effort_level,
            duration=duration,
            activity_type_code=type_code,
            category_id=category_id,
        ),
    )
    if approved:
        activity_service.update_activity(
            db_session, activity, ActivityUpdate(status=ReviewStatus.APPROVED)
        )
    return activity.id


@pytest.fixture
def admin_id(client):
    """Id of an admin that generates the packages of a test."""
    return client.post(
        "/api/users",
        json={"name": "Ada", "role": "admin", "email": "ada@example.com", "password": "x"},
    ).json()["id"]


@pytest.fixture
def categories(db_session):
    """Ids of the categories of the candidate activities, by name."""
    return {
        name: category_service.create_category(db_session, CategoryCreate(name=name)).id
        for name in ("Culture", "Food")
    }


@pytest.fixture
def activities(db_session, categories):
    """Ids of approved candidate activities, by name."""
    for code in ("walk", "show"):
        activity_type_service.create_activity_type(
            db_session, ActivityTypeCreate(code=code, name=code.title())
        )
    culture, food = categories["Culture"], categories["Food"]
    return {
        "Museum": _create_activity(db_session, "Museum", "walk", culture, 2, 90),
        "Hike": _create_activity(db_session, "Hike", "walk", culture, 5, 120),
        "Tasting": _create_activity(db_session, "Tasting", "show", food, 1, 60),
        "Concert": _create_activity(db_session, "Concert", "show", culture, 1, 120),
        "Market": _create_activity(db_session, "Market", "walk", food, 3, 60),
    }


@pytest.fixture
def payload(client, admin_id, activities, categories):
    package_id = _create_package(client, admin_id)
    return {
        "package_id": package_id,
        "days": 2,
        "activity_count": 4,
        "candidate_ids": list(activities.values()),
        "proportion_types": [
            {"activity_type_code": "walk", "value": 50},
            {"activity_type_code": "show", "value": 50},
        ],
        "proportion_categories": [
            {"category_id": categories["Culture"], "value": 50},
            {"category_id": categories["Food"], "value": 25},
        ],
    }


@pytest.fixture
def guide_id(client, payload):
    """Id of the guide authorized to generate itineraries of the payload's package."""
    guide_id = _create_guide(client)
    _authorize(client, payload["package_id"], guide_id)
    return guide_id


@pytest.fixture
def generate(client, as_user, payload, guide_id):
    """Post the payload to an itinerary generation route as the authorized guide."""

    def post(url="/api/itineraries", **overrides):
        with as_user(guide_id):
            return client.post(url, json={**payload, **overrides})

    return post


def _expected_compositions(activities):
    return [
        {"activity_id": activities["Hike"], "order": 1, "day": 1, "start_time": "09:00:00"},
        {"activity_id": activities["Tasting"], "order": 2, "day": 1, "start_time": "11:30:00"},
        {"activity_id": activities["Museum"], "order": 3, "day": 2, "start_time": "09:00:00"},
        {"activity_id": activities["Concert"], "order": 4, "day": 2, "start_time": "11:00:00"},
    ]


def test_preview_itinerary_returns_the_plan_without_saving_it(client, generate, activities):
    response = generate("/api/itineraries/generate")

    assert response.status_code == 200
    body = response.json()
    assert body["compositions"] == _expected_compositions(activities)
    assert all(criterion["met"] for criterion in body["criteria"])
    assert client.get("/api/itineraries").json() == []


def test_preview_itinerary_reports_criteria_not_met(generate, activities):
    response = generate(
        "/api/itineraries/generate",
        candidate_ids=[activities["Museum"], activities["Hike"], activities["Market"]],
    )

    criteria = {(c["key"], c["subject"]): c for c in response.json()["criteria"]}
    assert criteria[("activity_count", None)] == {
        "key": "activity_count",
        "subject": None,
        "target": 4,
        "actual": 3,
        "met": False,
    }
    assert criteria[("type_proportion", "walk")]["met"] is False
    assert criteria[("type_proportion", "show")]["actual"] == 0


def test_create_itinerary_saves_it_pending_with_its_parameters(
    client, generate, guide_id, payload, activities, categories
):
    response = generate()

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"
    assert body["activity_count"] == 4
    assert body["package_id"] == payload["package_id"]
    assert body["guide_id"] == guide_id
    assert body["compositions"] == _expected_compositions(activities)
    assert all(criterion["met"] for criterion in body["criteria"])
    url = f"/api/itineraries/{body['id']}"
    types = client.get(f"{url}/proportion-types").json()
    assert sorted((p["activity_type_code"], p["value"]) for p in types) == [
        ("show", 50),
        ("walk", 50),
    ]
    categories_stored = client.get(f"{url}/proportion-categories").json()
    assert sorted((p["category_id"], p["value"]) for p in categories_stored) == [
        (categories["Culture"], 50),
        (categories["Food"], 25),
    ]
    stored = client.get(f"{url}/activities").json()
    assert [composition["activity_id"] for composition in stored] == [
        activities["Hike"],
        activities["Tasting"],
        activities["Museum"],
        activities["Concert"],
    ]


def test_create_itinerary_returns_404_when_package_missing(generate):
    assert generate(package_id=999).status_code == 404


def test_create_itinerary_returns_409_when_package_not_approved(client, admin_id, generate):
    pending_package_id = _create_package(client, admin_id, name="Patagonia", approved=False)

    assert generate(package_id=pending_package_id).status_code == 409


def test_create_itinerary_returns_403_without_authorization(client, admin_id, generate):
    other_package_id = _create_package(client, admin_id, name="Patagonia")

    assert generate(package_id=other_package_id).status_code == 403


def test_create_itinerary_returns_403_without_can_generate(client, payload, guide_id, generate):
    _authorize(client, payload["package_id"], guide_id, can_generate=False)

    assert generate().status_code == 403


def test_create_itinerary_returns_403_for_non_guide(client, payload):
    response = client.post("/api/itineraries", json=payload)

    assert response.status_code == 403


def test_create_itinerary_returns_404_when_activity_missing(generate):
    assert generate(candidate_ids=[999]).status_code == 404


def test_create_itinerary_returns_409_when_activity_not_approved(db_session, generate):
    pending_id = _create_activity(db_session, "Cave", "walk", None, 4, 60, approved=False)

    assert generate(candidate_ids=[pending_id]).status_code == 409


def test_create_itinerary_returns_404_when_activity_type_missing(generate):
    response = generate(proportion_types=[{"activity_type_code": "fly", "value": 10}])

    assert response.status_code == 404


def test_create_itinerary_returns_404_when_category_missing(generate):
    response = generate(proportion_categories=[{"category_id": 999, "value": 10}])

    assert response.status_code == 404


def test_create_itinerary_returns_422_with_more_days_than_activities(generate):
    assert generate(days=5).status_code == 422


def test_create_itinerary_returns_422_when_a_day_overflows(db_session, generate):
    long_ids = [_create_activity(db_session, f"Trek {n}", "walk", None, 5, 600) for n in range(2)]

    response = generate(days=1, activity_count=2, candidate_ids=long_ids)

    assert response.status_code == 422


def test_list_itineraries_includes_created_itinerary(client, create_itinerary):
    create_itinerary()

    response = client.get("/api/itineraries")

    assert response.status_code == 200
    assert any(i["activity_count"] == 2 for i in response.json())


def test_get_itinerary_returns_404_when_missing(client):
    response = client.get("/api/itineraries/999")

    assert response.status_code == 404


def test_update_itinerary_changes_status(client, create_itinerary):
    itinerary_id = create_itinerary()

    response = client.patch(f"/api/itineraries/{itinerary_id}", json={"status": "validated"})

    assert response.status_code == 200
    assert response.json()["status"] == "validated"


def test_update_itinerary_returns_403_for_another_guide(client, as_user, create_itinerary):
    itinerary_id = create_itinerary()
    other_guide_id = _create_guide(client, email="gus@example.com")

    with as_user(other_guide_id):
        response = client.patch(f"/api/itineraries/{itinerary_id}", json={"status": "validated"})

    assert response.status_code == 403


def test_delete_itinerary_removes_it(client, create_itinerary):
    itinerary_id = create_itinerary()

    response = client.delete(f"/api/itineraries/{itinerary_id}")

    assert response.status_code == 204
    assert client.get(f"/api/itineraries/{itinerary_id}").status_code == 404


def test_delete_itinerary_returns_403_for_guide(
    client, as_user, itinerary_owners, create_itinerary
):
    itinerary_id = create_itinerary()

    with as_user(itinerary_owners["guide_id"]):
        response = client.delete(f"/api/itineraries/{itinerary_id}")

    assert response.status_code == 403


def test_list_itineraries_filters_by_status(client, create_itinerary):
    validated_id = create_itinerary()
    create_itinerary()
    client.patch(f"/api/itineraries/{validated_id}", json={"status": "validated"})

    response = client.get("/api/itineraries", params={"status": "validated"})

    assert response.status_code == 200
    assert [i["id"] for i in response.json()] == [validated_id]

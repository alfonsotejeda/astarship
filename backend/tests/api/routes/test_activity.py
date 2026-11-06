"""Tests for the activity routes."""

from datetime import date

import pytest


@pytest.fixture
def guide_id(client):
    """Id of a guide that describes the activities of a test."""
    return client.post(
        "/api/users",
        json={
            "name": "Gil",
            "role": "guide",
            "email": "gil@example.com",
            "password": "x",
            "specialty": "History",
        },
    ).json()["id"]


@pytest.fixture
def refs(client, guide_id):
    """Category, activity type, guide and attraction every activity needs."""
    category = client.post("/api/categories/create", json={"name": "Adventure"}).json()
    client.post("/api/activity-types", json={"code": "HIKE", "name": "Hiking"})
    attraction = client.post(
        "/api/attractions",
        json={
            "name": "Malecón",
            "address": "Av. del Puerto",
            "latitude": 23.14,
            "longitude": -82.36,
        },
    ).json()
    return {
        "category_id": category["id"],
        "activity_type_code": "HIKE",
        "guide_id": guide_id,
        "attraction_id": attraction["id"],
    }


@pytest.fixture
def as_guide(as_user, guide_id):
    """Context manager that makes the client call as the test guide."""
    return lambda: as_user(guide_id)


def _create(client, as_guide, refs, name="Hiking", effort_level=3, duration=90, **overrides):
    payload = {
        "name": name,
        "effort_level": effort_level,
        "duration": duration,
        **refs,
        **overrides,
    }
    with as_guide():
        return client.post("/api/activities", json=payload)


def test_create_activity_returns_201(client, as_guide, refs):
    response = _create(client, as_guide, refs)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Hiking"
    assert body["duration"] == 90
    assert body["category_id"] == refs["category_id"]
    assert body["activity_type_code"] == "HIKE"
    assert body["guide_id"] == refs["guide_id"]
    assert body["attraction_id"] == refs["attraction_id"]
    assert body["status"] == "pending"
    assert body["creation_date"] == date.today().isoformat()


def test_create_activity_returns_422_without_duration(client, as_guide, refs):
    with as_guide():
        response = client.post(
            "/api/activities", json={"name": "Hiking", "effort_level": 3, **refs}
        )

    assert response.status_code == 422


def test_create_activity_returns_422_for_non_positive_duration(client, as_guide, refs):
    response = _create(client, as_guide, refs, duration=0)

    assert response.status_code == 422


@pytest.mark.parametrize(
    "missing", ["activity_type_code", "category_id", "guide_id", "attraction_id"]
)
def test_create_activity_without_a_foreign_key_returns_422(client, as_guide, refs, missing):
    payload = {"name": "Hiking", "effort_level": 3, "duration": 90}
    payload.update({k: v for k, v in refs.items() if k != missing})

    with as_guide():
        response = client.post("/api/activities", json=payload)

    assert response.status_code == 422


def test_create_activity_returns_403_for_non_guide(client, refs):
    response = client.post(
        "/api/activities", json={"name": "Hiking", "effort_level": 3, "duration": 90, **refs}
    )

    assert response.status_code == 403


@pytest.mark.parametrize(
    "field, value, text",
    [
        ("category_id", 999999, "Category"),
        ("guide_id", 999999, "Guide"),
        ("activity_type_code", "MISSING", "Activity Type"),
        ("attraction_id", 999999, "Attraction"),
    ],
)
def test_create_activity_with_unknown_reference_returns_404(
    client, as_guide, refs, field, value, text
):
    response = _create(client, as_guide, refs, **{field: value})

    assert response.status_code == 404
    assert text in response.json()["detail"]


def test_create_activity_with_repeated_name_in_attraction_returns_409(client, as_guide, refs):
    _create(client, as_guide, refs, name="Tour")

    response = _create(client, as_guide, refs, name="Tour")

    assert response.status_code == 409


def test_list_activities_includes_created_activity(client, as_guide, refs):
    _create(client, as_guide, refs)

    response = client.get("/api/activities")

    assert response.status_code == 200
    assert any(a["name"] == "Hiking" for a in response.json())


def test_get_activity_returns_404_when_missing(client):
    response = client.get("/api/activities/999999")

    assert response.status_code == 404


def test_update_activity_changes_name(client, as_guide, refs):
    created = _create(client, as_guide, refs, name="Old", effort_level=1).json()

    with as_guide():
        response = client.patch(f"/api/activities/{created['id']}", json={"name": "New"})

    assert response.status_code == 200
    assert response.json()["name"] == "New"


def test_update_activity_changes_duration(client, as_guide, refs):
    created = _create(client, as_guide, refs).json()

    with as_guide():
        response = client.patch(f"/api/activities/{created['id']}", json={"duration": 45})

    assert response.status_code == 200
    assert response.json()["duration"] == 45


def test_update_activity_with_only_effort_level_keeps_the_rest(client, as_guide, refs):
    created = _create(client, as_guide, refs, name="Temp", effort_level=1).json()

    with as_guide():
        response = client.patch(f"/api/activities/{created['id']}", json={"effort_level": 5})

    assert response.status_code == 200
    body = response.json()
    assert body["effort_level"] == 5
    assert body["category_id"] == refs["category_id"]
    assert body["guide_id"] == refs["guide_id"]
    assert body["attraction_id"] == refs["attraction_id"]


def test_update_activity_changes_status(client, as_guide, refs):
    created = _create(client, as_guide, refs).json()

    with as_guide():
        response = client.patch(f"/api/activities/{created['id']}", json={"status": "rejected"})

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"


@pytest.mark.parametrize(
    "field, text", [("category_id", "Category"), ("attraction_id", "Attraction")]
)
def test_update_activity_with_unknown_reference_returns_404(client, as_guide, refs, field, text):
    created = _create(client, as_guide, refs).json()

    with as_guide():
        response = client.patch(f"/api/activities/{created['id']}", json={field: 999999})

    assert response.status_code == 404
    assert text in response.json()["detail"]


@pytest.mark.parametrize("field", ["category_id", "guide_id", "attraction_id"])
def test_update_activity_with_null_foreign_key_returns_422(client, as_guide, refs, field):
    created = _create(client, as_guide, refs).json()

    with as_guide():
        response = client.patch(f"/api/activities/{created['id']}", json={field: None})

    assert response.status_code == 422


def test_update_activity_to_a_taken_name_returns_409(client, as_guide, refs):
    _create(client, as_guide, refs, name="Taken")
    other = _create(client, as_guide, refs, name="Free").json()

    with as_guide():
        response = client.patch(f"/api/activities/{other['id']}", json={"name": "Taken"})

    assert response.status_code == 409


def test_delete_activity_removes_it(client, as_guide, refs):
    created = _create(client, as_guide, refs, name="Temp", effort_level=1).json()

    response = client.delete(f"/api/activities/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/activities/{created['id']}").status_code == 404


def test_delete_activity_returns_403_for_guide(client, as_guide, refs):
    created = _create(client, as_guide, refs, name="Temp", effort_level=1).json()

    with as_guide():
        response = client.delete(f"/api/activities/{created['id']}")

    assert response.status_code == 403


def test_list_activities_filters_by_status(client, as_guide, refs):
    approved = _create(client, as_guide, refs, name="A", effort_level=1).json()
    _create(client, as_guide, refs, name="B", effort_level=1)
    with as_guide():
        client.patch(f"/api/activities/{approved['id']}", json={"status": "approved"})

    response = client.get("/api/activities", params={"status": "approved"})

    assert response.status_code == 200
    assert [a["id"] for a in response.json()] == [approved["id"]]


def test_activities_by_type_returns_only_that_type_ordered_by_name(client, as_guide, refs):
    client.post("/api/activity-types", json={"code": "MUSEUM", "name": "Museum"})
    _create(client, as_guide, refs, name="Beta")
    _create(client, as_guide, refs, name="Alpha")
    _create(client, as_guide, refs, name="Louvre", activity_type_code="MUSEUM")

    response = client.get("/api/activities/by_type/HIKE")

    assert response.status_code == 200
    assert [a["name"] for a in response.json()] == ["Alpha", "Beta"]


def test_activities_by_type_returns_404_when_type_is_missing(client):
    response = client.get("/api/activities/by_type/MISSING")

    assert response.status_code == 404

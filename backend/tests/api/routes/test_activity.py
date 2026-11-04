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
def as_guide(as_user, guide_id):
    """Context manager that makes the client call as the test guide."""
    return lambda: as_user(guide_id)


def _create(client, as_guide, name="Hiking", effort_level=3, duration=90):
    with as_guide():
        return client.post(
            "/api/activities",
            json={"name": name, "effort_level": effort_level, "duration": duration},
        )


def test_create_activity_returns_201(client, as_guide):
    response = _create(client, as_guide)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Hiking"
    assert body["duration"] == 90
    assert body["category_id"] is None
    assert body["status"] == "pending"
    assert body["creation_date"] == date.today().isoformat()


def test_create_activity_returns_422_without_duration(client, as_guide):
    with as_guide():
        response = client.post("/api/activities", json={"name": "Hiking", "effort_level": 3})

    assert response.status_code == 422


def test_create_activity_returns_422_for_non_positive_duration(client, as_guide):
    response = _create(client, as_guide, duration=0)

    assert response.status_code == 422


def test_create_activity_returns_403_for_non_guide(client):
    response = client.post(
        "/api/activities", json={"name": "Hiking", "effort_level": 3, "duration": 90}
    )

    assert response.status_code == 403


def test_list_activities_includes_created_activity(client, as_guide):
    _create(client, as_guide)

    response = client.get("/api/activities")

    assert response.status_code == 200
    assert any(a["name"] == "Hiking" for a in response.json())


def test_get_activity_returns_404_when_missing(client):
    response = client.get("/api/activities/999999")

    assert response.status_code == 404


def test_update_activity_changes_name(client, as_guide):
    created = _create(client, as_guide, name="Old", effort_level=1).json()

    with as_guide():
        response = client.patch(f"/api/activities/{created['id']}", json={"name": "New"})

    assert response.status_code == 200
    assert response.json()["name"] == "New"


def test_update_activity_changes_duration(client, as_guide):
    created = _create(client, as_guide).json()

    with as_guide():
        response = client.patch(f"/api/activities/{created['id']}", json={"duration": 45})

    assert response.status_code == 200
    assert response.json()["duration"] == 45


def test_delete_activity_removes_it(client, as_guide):
    created = _create(client, as_guide, name="Temp", effort_level=1).json()

    response = client.patch(f"/api/activities/{created['id']}", json={"effort_level": 5})

    assert response.status_code == 200
    body = response.json()
    assert body["effort_level"] == 5
    assert body["category_id"] == refs["category_id"]
    assert body["guide_id"] == refs["guide_id"]


def test_delete_activity_returns_403_for_guide(client, as_guide):
    created = _create(client, as_guide, name="Temp", effort_level=1).json()

    with as_guide():
        response = client.delete(f"/api/activities/{created['id']}")

    assert response.status_code == 403


def test_update_activity_changes_status(client, as_guide):
    created = _create(client, as_guide).json()

    with as_guide():
        response = client.patch(f"/api/activities/{created['id']}", json={"status": "rejected"})

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"


def test_list_activities_filters_by_status(client, as_guide):
    approved = _create(client, as_guide, name="A", effort_level=1).json()
    _create(client, as_guide, name="B", effort_level=1)
    with as_guide():
        client.patch(f"/api/activities/{approved['id']}", json={"status": "approved"})

    response = client.get("/api/activities", params={"status": "approved"})

    assert response.status_code == 200
    assert [a["id"] for a in response.json()] == [approved["id"]]


def test_activities_by_type_returns_only_that_type_ordered_by_name(client, refs):
    client.post("/api/activity-types", json={"code": "MUSEUM", "name": "Museum"})
    _create(client, refs, name="Beta")
    _create(client, refs, name="Alpha")
    _create(client, refs, name="Louvre", activity_type_code="MUSEUM")

    response = client.get("/api/activities/by_type/HIKE")

    assert response.status_code == 200
    assert [a["name"] for a in response.json()] == ["Alpha", "Beta"]


def test_activities_by_type_returns_404_when_type_is_missing(client):
    response = client.get("/api/activities/by_type/MISSING")

    assert response.status_code == 404

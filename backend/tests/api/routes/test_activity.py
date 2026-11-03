"""Tests for the activity routes."""

from datetime import date

import pytest


@pytest.fixture
def refs(client):
    """Ids of the category, activity type and guide every activity needs."""
    category = client.post("/api/categories/create", json={"name": "Adventure"}).json()
    client.post("/api/activity-types", json={"code": "HIKE", "name": "Hiking"})
    guide = client.post(
        "/api/users",
        json={
            "name": "Gil",
            "role": "guide",
            "email": "gil@example.com",
            "password": "x",
            "specialty": "History",
        },
    ).json()
    return {
        "category_id": category["id"],
        "activity_type_code": "HIKE",
        "guide_id": guide["id"],
    }


def _create(client, refs, name="Hiking", **overrides):
    payload = {"name": name, "effort_level": 3, **refs, **overrides}
    return client.post("/api/activities", json=payload)


def test_create_activity_returns_201(client, refs):
    response = _create(client, refs)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Hiking"
    assert body["category_id"] == refs["category_id"]
    assert body["activity_type_code"] == "HIKE"
    assert body["guide_id"] == refs["guide_id"]
    assert body["status"] == "pending"
    assert body["creation_date"] == date.today().isoformat()


def test_create_activity_without_foreign_keys_returns_422(client):
    response = client.post("/api/activities", json={"name": "Hiking", "effort_level": 3})

    assert response.status_code == 422


@pytest.mark.parametrize(
    "field, value, detail",
    [
        ("category_id", 999999, "Category does not exist."),
        ("guide_id", 999999, "Guide does not exist."),
        ("activity_type_code", "MISSING", "Activity Type does not exist"),
    ],
)
def test_create_activity_with_unknown_reference_returns_404(client, refs, field, value, detail):
    response = _create(client, refs, **{field: value})

    assert response.status_code == 404
    assert response.json()["detail"] == detail


def test_list_activities_includes_created_activity(client, refs):
    _create(client, refs)

    response = client.get("/api/activities")

    assert response.status_code == 200
    assert any(a["name"] == "Hiking" for a in response.json())


def test_get_activity_returns_404_when_missing(client):
    response = client.get("/api/activities/999999")

    assert response.status_code == 404


def test_update_activity_changes_name(client, refs):
    created = _create(client, refs, name="Old", effort_level=1).json()

    response = client.patch(f"/api/activities/{created['id']}", json={"name": "New"})

    assert response.status_code == 200
    assert response.json()["name"] == "New"


def test_update_activity_with_only_effort_level_keeps_the_rest(client, refs):
    created = _create(client, refs).json()

    response = client.patch(f"/api/activities/{created['id']}", json={"effort_level": 5})

    assert response.status_code == 200
    body = response.json()
    assert body["effort_level"] == 5
    assert body["category_id"] == refs["category_id"]
    assert body["guide_id"] == refs["guide_id"]


def test_update_activity_changes_status(client, refs):
    created = _create(client, refs).json()

    response = client.patch(f"/api/activities/{created['id']}", json={"status": "rejected"})

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"


def test_update_activity_with_unknown_category_returns_404(client, refs):
    created = _create(client, refs).json()

    response = client.patch(f"/api/activities/{created['id']}", json={"category_id": 999999})

    assert response.status_code == 404
    assert response.json()["detail"] == "Category does not exist."


def test_update_activity_with_null_foreign_key_returns_422(client, refs):
    created = _create(client, refs).json()

    response = client.patch(f"/api/activities/{created['id']}", json={"category_id": None})

    assert response.status_code == 422


def test_delete_activity_removes_it(client, refs):
    created = _create(client, refs, name="Temp", effort_level=1).json()

    response = client.delete(f"/api/activities/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/activities/{created['id']}").status_code == 404


def test_list_activities_filters_by_status(client, refs):
    approved = _create(client, refs, name="A").json()
    _create(client, refs, name="B")
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

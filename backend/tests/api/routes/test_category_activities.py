"""Tests for the activity endpoints of the category routes."""

import pytest


@pytest.fixture
def refs(client):
    """The activity type, guide and attraction every activity needs."""
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
        "activity_type_code": "HIKE",
        "guide_id": guide["id"],
        "attraction_id": attraction["id"],
    }


def _create_category(client, name):
    return client.post("/api/categories/create", json={"name": name}).json()


def _add_activity(client, as_user, refs, category, name):
    payload = {
        "name": name,
        "effort_level": 3,
        "duration": 90,
        "category_id": category["id"],
        **refs,
    }
    with as_user(refs["guide_id"]):
        return client.post("/api/activities", json=payload)


def test_activities_by_category_returns_only_its_activities_ordered_by_name(client, as_user, refs):
    adventure = _create_category(client, "Adventure")
    culture = _create_category(client, "Culture")
    _add_activity(client, as_user, refs, adventure, "Beta")
    _add_activity(client, as_user, refs, adventure, "Alpha")
    _add_activity(client, as_user, refs, culture, "Museum")

    response = client.get(f"/api/categories/{adventure['id']}/activities")

    assert response.status_code == 200
    assert [a["name"] for a in response.json()] == ["Alpha", "Beta"]


def test_activities_by_category_returns_empty_list_when_it_has_none(client):
    category = _create_category(client, "Empty")

    response = client.get(f"/api/categories/{category['id']}/activities")

    assert response.status_code == 200
    assert response.json() == []


def test_activities_by_category_returns_404_when_category_is_missing(client):
    response = client.get("/api/categories/999999/activities")

    assert response.status_code == 404
    assert response.json()["detail"] == "Category does not exist"


def test_activities_count_includes_categories_without_activities(client, as_user, refs):
    adventure = _create_category(client, "Adventure")
    culture = _create_category(client, "Culture")
    _add_activity(client, as_user, refs, adventure, "Alpha")
    _add_activity(client, as_user, refs, adventure, "Beta")

    response = client.get("/api/categories/activities_count")

    assert response.status_code == 200
    assert response.json() == [
        [{"id": adventure["id"], "name": "Adventure"}, 2],
        [{"id": culture["id"], "name": "Culture"}, 0],
    ]


def test_activities_count_is_empty_without_categories(client):
    response = client.get("/api/categories/activities_count")

    assert response.status_code == 200
    assert response.json() == []


def test_delete_category_with_activities_returns_409(client, as_user, refs):
    category = _create_category(client, "Adventure")
    _add_activity(client, as_user, refs, category, "Alpha")

    response = client.delete(f"/api/categories/{category['id']}")

    assert response.status_code == 409
    assert client.get(f"/api/categories/{category['id']}").status_code == 200

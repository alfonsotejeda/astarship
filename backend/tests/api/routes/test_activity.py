"""Tests for the activity routes."""


def test_create_activity_returns_201(client):
    response = client.post(
        "/api/activities",
        json={"name": "Hiking", "effort_level": 3},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Hiking"
    assert body["category_id"] is None


def test_list_activities_includes_created_activity(client):
    client.post("/api/activities", json={"name": "Hiking", "effort_level": 3})

    response = client.get("/api/activities")

    assert response.status_code == 200
    assert any(a["name"] == "Hiking" for a in response.json())


def test_get_activity_returns_404_when_missing(client):
    response = client.get("/api/activities/999999")

    assert response.status_code == 404


def test_update_activity_changes_name(client):
    created = client.post(
        "/api/activities", json={"name": "Old", "effort_level": 1}
    ).json()

    response = client.patch(f"/api/activities/{created['id']}", json={"name": "New"})

    assert response.status_code == 200
    assert response.json()["name"] == "New"


def test_delete_activity_removes_it(client):
    created = client.post(
        "/api/activities", json={"name": "Temp", "effort_level": 1}
    ).json()

    response = client.delete(f"/api/activities/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/activities/{created['id']}").status_code == 404

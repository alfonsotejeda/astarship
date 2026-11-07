"""Tests for the activity type routes."""


def test_create_activity_type_returns_201(client):
    response = client.post(
        "/api/activity-types",
        json={"code": "HIKE", "name": "Hiking"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["code"] == "HIKE"
    assert body["name"] == "Hiking"


def test_list_activity_types_includes_created_activity_type(client):
    client.post("/api/activity-types", json={"code": "HIKE", "name": "Hiking"})

    response = client.get("/api/activity-types")

    assert response.status_code == 200
    assert any(a["code"] == "HIKE" for a in response.json())


def test_get_activity_type_returns_404_when_missing(client):
    response = client.get("/api/activity-types/MISSING")

    assert response.status_code == 404


def test_update_activity_type_changes_name(client):
    client.post("/api/activity-types", json={"code": "HIKE", "name": "Old"})

    response = client.patch("/api/activity-types/HIKE", json={"name": "New"})

    assert response.status_code == 200
    assert response.json()["name"] == "New"


def test_delete_activity_type_removes_it(client):
    client.post("/api/activity-types", json={"code": "TEMP", "name": "Temp"})

    response = client.delete("/api/activity-types/TEMP")

    assert response.status_code == 204
    assert client.get("/api/activity-types/TEMP").status_code == 404


def test_delete_activity_type_with_activities_returns_409(client, as_user):
    client.post("/api/activity-types", json={"code": "HIKE", "name": "Hiking"})
    category = client.post("/api/categories/create", json={"name": "Adventure"}).json()
    attraction = client.post(
        "/api/attractions",
        json={
            "name": "Malecón",
            "address": "Av. del Puerto",
            "latitude": 23.14,
            "longitude": -82.36,
        },
    ).json()
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
    with as_user(guide["id"]):
        client.post(
            "/api/activities",
            json={
                "name": "Hiking",
                "effort_level": 3,
                "duration": 90,
                "activity_type_code": "HIKE",
                "category_id": category["id"],
                "guide_id": guide["id"],
                "attraction_id": attraction["id"],
            },
        )

    response = client.delete("/api/activity-types/HIKE")

    assert response.status_code == 409
    assert client.get("/api/activity-types/HIKE").status_code == 200

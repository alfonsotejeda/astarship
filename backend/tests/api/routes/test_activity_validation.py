"""Tests for the activity validation routes."""


def _create_admin(client, email="ana@example.com") -> int:
    return client.post(
        "/api/users",
        json={"name": "Ana", "role": "admin", "email": email, "password": "x"},
    ).json()["id"]


def _validate(client, activity_id, admin_id, result="approved", **fields):
    return client.post(
        f"/api/activities/{activity_id}/validations",
        json={"admin_id": admin_id, "result": result, **fields},
    )


def test_create_validation_returns_201(client, insert_activity):
    activity_id = insert_activity().id
    admin_id = _create_admin(client)

    response = _validate(client, activity_id, admin_id, observations="Not a duplicate")

    assert response.status_code == 201
    body = response.json()
    assert body["activity_id"] == activity_id
    assert body["admin_id"] == admin_id
    assert body["result"] == "approved"
    assert body["observations"] == "Not a duplicate"
    assert body["validation_date"]


def test_create_validation_observations_are_optional(client, insert_activity):
    activity_id = insert_activity().id
    admin_id = _create_admin(client)

    response = _validate(client, activity_id, admin_id)

    assert response.status_code == 201
    assert response.json()["observations"] is None


def test_approving_sets_the_activity_status_to_approved(client, insert_activity):
    activity_id = insert_activity().id
    admin_id = _create_admin(client)

    _validate(client, activity_id, admin_id, "approved")

    assert client.get(f"/api/activities/{activity_id}").json()["status"] == "approved"


def test_rejecting_sets_the_activity_status_to_rejected(client, insert_activity):
    activity_id = insert_activity().id
    admin_id = _create_admin(client)

    _validate(client, activity_id, admin_id, "rejected", observations="Duplicate of #3")

    assert client.get(f"/api/activities/{activity_id}").json()["status"] == "rejected"


def test_latest_validation_decides_the_activity_status(client, insert_activity):
    activity_id = insert_activity().id
    admin_id = _create_admin(client)
    _validate(client, activity_id, admin_id, "rejected")

    _validate(client, activity_id, admin_id, "approved")

    assert client.get(f"/api/activities/{activity_id}").json()["status"] == "approved"


def test_create_validation_returns_404_when_activity_missing(client):
    admin_id = _create_admin(client)

    response = _validate(client, 999999, admin_id)

    assert response.status_code == 404


def test_create_validation_returns_404_when_admin_missing(client, insert_activity):
    activity_id = insert_activity().id

    response = _validate(client, activity_id, 999999)

    assert response.status_code == 404
    assert client.get(f"/api/activities/{activity_id}").json()["status"] == "pending"


def test_create_validation_returns_404_when_user_is_not_an_admin(client, insert_activity):
    activity_id = insert_activity().id
    tourist_id = client.post(
        "/api/users",
        json={
            "name": "Tim",
            "role": "tourist",
            "email": "tim@example.com",
            "password": "x",
            "age": 30,
        },
    ).json()["id"]

    response = _validate(client, activity_id, tourist_id)

    assert response.status_code == 404


def test_create_validation_returns_422_for_unknown_result(client, insert_activity):
    activity_id = insert_activity().id
    admin_id = _create_admin(client)

    response = _validate(client, activity_id, admin_id, "pending")

    assert response.status_code == 422
    assert client.get(f"/api/activities/{activity_id}").json()["status"] == "pending"


def test_list_validations_returns_empty_list_for_a_new_activity(client, insert_activity):
    activity_id = insert_activity().id

    response = client.get(f"/api/activities/{activity_id}/validations")

    assert response.status_code == 200
    assert response.json() == []


def test_list_validations_returns_the_most_recent_first(client, insert_activity):
    activity_id = insert_activity().id
    admin_id = _create_admin(client)
    _validate(client, activity_id, admin_id, "rejected")
    _validate(client, activity_id, admin_id, "approved")

    response = client.get(f"/api/activities/{activity_id}/validations")

    assert response.status_code == 200
    assert [v["result"] for v in response.json()] == ["approved", "rejected"]


def test_list_validations_only_returns_those_of_the_activity(client, insert_activity):
    first = insert_activity("Hiking").id
    second = insert_activity("Museum").id
    admin_id = _create_admin(client)
    _validate(client, first, admin_id)
    _validate(client, second, admin_id, "rejected")

    response = client.get(f"/api/activities/{first}/validations")

    assert [v["activity_id"] for v in response.json()] == [first]


def test_list_validations_returns_404_when_activity_missing(client):
    response = client.get("/api/activities/999999/validations")

    assert response.status_code == 404


def test_deleting_an_activity_removes_its_validations(client, insert_activity):
    activity_id = insert_activity().id
    admin_id = _create_admin(client)
    _validate(client, activity_id, admin_id)

    assert client.delete(f"/api/activities/{activity_id}").status_code == 204
    assert client.delete(f"/api/users/{admin_id}").status_code == 204

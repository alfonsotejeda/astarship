"""Tests for the activity validation routes."""

import pytest


def _create_admin(client, email="ana@example.com", name="Ana") -> int:
    return client.post(
        "/api/users",
        json={"name": name, "role": "admin", "email": email, "password": "x"},
    ).json()["id"]


def _validate(client, as_user, activity_id, reviewer_id, result="approved", **fields):
    with as_user(reviewer_id):
        return client.post(
            f"/api/activities/{activity_id}/validations", json={"result": result, **fields}
        )


def _correct(client, as_user, activity):
    """The guide who described the activity edits it, so it goes back to pending."""
    with as_user(activity.guide_id):
        response = client.patch(f"/api/activities/{activity.id}", json={"duration": 90})
    assert response.json()["status"] == "pending"


def test_create_validation_returns_the_reviewed_activity(client, as_user, insert_activity):
    activity_id = insert_activity().id
    admin_id = _create_admin(client)

    response = _validate(client, as_user, activity_id, admin_id, observations="Not a duplicate")

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == activity_id
    assert body["status"] == "approved"
    assert body["last_validation"]["reviewer_name"] == "Ana"
    assert body["last_validation"]["result"] == "approved"
    assert body["last_validation"]["observations"] == "Not a duplicate"


def test_create_validation_observations_are_optional(client, as_user, insert_activity):
    activity_id = insert_activity().id
    admin_id = _create_admin(client)

    response = _validate(client, as_user, activity_id, admin_id)

    assert response.status_code == 201
    assert response.json()["last_validation"]["observations"] is None


def test_validation_is_recorded_for_the_logged_in_admin(client, as_user, insert_activity):
    activity_id = insert_activity().id
    ana = _create_admin(client)
    bea = _create_admin(client, email="bea@example.com", name="Bea")

    # Ana tries to sign the review as Bea: the admin in the body is ignored
    response = _validate(client, as_user, activity_id, ana, admin_id=bea)

    assert response.json()["last_validation"]["reviewer_name"] == "Ana"


def test_approving_sets_the_activity_status_to_approved(client, as_user, insert_activity):
    activity_id = insert_activity().id
    admin_id = _create_admin(client)

    _validate(client, as_user, activity_id, admin_id, "approved")

    assert client.get(f"/api/activities/{activity_id}").json()["status"] == "approved"


def test_rejecting_sets_the_activity_status_to_rejected(client, as_user, insert_activity):
    activity_id = insert_activity().id
    admin_id = _create_admin(client)

    _validate(client, as_user, activity_id, admin_id, "rejected", observations="Duplicate of #3")

    assert client.get(f"/api/activities/{activity_id}").json()["status"] == "rejected"


def test_corrected_activity_can_be_approved_after_a_rejection(client, as_user, insert_activity):
    activity = insert_activity()
    admin_id = _create_admin(client)
    _validate(client, as_user, activity.id, admin_id, "rejected", observations="No meeting point")
    _correct(client, as_user, activity)

    response = _validate(client, as_user, activity.id, admin_id, "approved")

    assert response.status_code == 201
    assert client.get(f"/api/activities/{activity.id}").json()["status"] == "approved"


@pytest.mark.parametrize("first", ["approved", "rejected"])
def test_create_validation_returns_409_when_activity_is_not_pending(
    client, as_user, insert_activity, first
):
    activity_id = insert_activity().id
    admin_id = _create_admin(client)
    _validate(client, as_user, activity_id, admin_id, first)

    response = _validate(client, as_user, activity_id, admin_id, "approved")

    assert response.status_code == 409
    assert len(client.get(f"/api/activities/{activity_id}/validations").json()) == 1


def test_create_validation_returns_404_when_activity_missing(client, as_user):
    admin_id = _create_admin(client)

    response = _validate(client, as_user, 999999, admin_id)

    assert response.status_code == 404


def test_create_validation_returns_401_without_login(anonymous_client, insert_activity):
    activity_id = insert_activity().id

    response = anonymous_client.post(
        f"/api/activities/{activity_id}/validations", json={"result": "approved"}
    )

    assert response.status_code == 401


def test_create_validation_returns_403_when_user_is_not_an_admin(client, as_user, insert_activity):
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

    response = _validate(client, as_user, activity_id, tourist_id)

    assert response.status_code == 403
    assert client.get(f"/api/activities/{activity_id}").json()["status"] == "pending"


def test_create_validation_returns_422_for_unknown_result(client, as_user, insert_activity):
    activity_id = insert_activity().id
    admin_id = _create_admin(client)

    response = _validate(client, as_user, activity_id, admin_id, "pending")

    assert response.status_code == 422
    assert client.get(f"/api/activities/{activity_id}").json()["status"] == "pending"


def test_list_validations_returns_empty_list_for_a_new_activity(client, insert_activity):
    activity_id = insert_activity().id

    response = client.get(f"/api/activities/{activity_id}/validations")

    assert response.status_code == 200
    assert response.json() == []


def test_list_validations_returns_the_most_recent_first(client, as_user, insert_activity):
    activity = insert_activity()
    admin_id = _create_admin(client)
    _validate(client, as_user, activity.id, admin_id, "rejected")
    _correct(client, as_user, activity)
    _validate(client, as_user, activity.id, admin_id, "approved")

    response = client.get(f"/api/activities/{activity.id}/validations")

    assert response.status_code == 200
    assert [v["result"] for v in response.json()] == ["approved", "rejected"]


def test_list_validations_only_returns_those_of_the_activity(client, as_user, insert_activity):
    first = insert_activity("Hiking").id
    second = insert_activity("Museum").id
    admin_id = _create_admin(client)
    _validate(client, as_user, first, admin_id)
    _validate(client, as_user, second, admin_id, "rejected")

    response = client.get(f"/api/activities/{first}/validations")

    assert [v["activity_id"] for v in response.json()] == [first]


def test_list_validations_returns_404_when_activity_missing(client):
    response = client.get("/api/activities/999999/validations")

    assert response.status_code == 404


def test_deleting_an_activity_removes_its_validations(client, as_user, insert_activity):
    activity_id = insert_activity().id
    admin_id = _create_admin(client)
    _validate(client, as_user, activity_id, admin_id)

    assert client.delete(f"/api/activities/{activity_id}").status_code == 204
    assert client.delete(f"/api/users/{admin_id}").status_code == 204

"""Tests for the package validation routes."""


def _create_user(client, role, email, **fields) -> int:
    return client.post(
        "/api/users",
        json={"name": "Una", "role": role, "email": email, "password": "x", **fields},
    ).json()["id"]


def _create_package(client, admin_id, name="Andes", destination="Peru") -> int:
    """Create a package through the API and return its id."""
    return client.post(
        "/api/packages", json={"name": name, "destination": destination, "admin_id": admin_id}
    ).json()["id"]


def _create_manager(client, email="olga@example.com") -> int:
    return _create_user(client, "operations_manager", email, name="Olga")


def _validate(client, package_id, result, observations=None):
    payload = {"result": result}
    if observations is not None:
        payload["observations"] = observations
    return client.post(f"/api/packages/{package_id}/validations", json=payload)


# --- GET /packages/{package_id}/validations ---


def test_list_validations_returns_empty_list_for_package_without_validations(client):
    admin_id = _create_user(client, "admin", "ana@example.com")
    package_id = _create_package(client, admin_id)

    response = client.get(f"/api/packages/{package_id}/validations")

    assert response.status_code == 200
    assert response.json() == []


def test_list_validations_returns_the_most_recent_first(client, as_user):
    admin_id = _create_user(client, "admin", "ana@example.com")
    package_id = _create_package(client, admin_id)
    manager_id = _create_manager(client)

    with as_user(manager_id):
        first = _validate(client, package_id, "rejected", observations="Needs work")
        assert first.status_code == 201
        # Un paquete ya validado ya no está pendiente: no admite otra validación.
        second = _validate(client, package_id, "approved")
        assert second.status_code == 409

    response = client.get(f"/api/packages/{package_id}/validations")

    assert response.status_code == 200
    body = response.json()
    assert [v["result"] for v in body] == ["rejected"]
    assert body[0]["observations"] == "Needs work"
    assert body[0]["reviewer_id"] == manager_id
    assert body[0]["reviewer_name"] == "Olga"


def test_list_validations_returns_404_when_package_missing(client):
    response = client.get("/api/packages/999999/validations")

    assert response.status_code == 404


def test_list_validations_requires_authentication(anonymous_client):
    response = anonymous_client.get("/api/packages/1/validations")

    assert response.status_code == 401


# --- POST /packages/{package_id}/validations ---


def test_create_validation_approved_returns_201_and_approves_package(client, as_user):
    admin_id = _create_user(client, "admin", "ana@example.com")
    package_id = _create_package(client, admin_id)
    manager_id = _create_manager(client)

    with as_user(manager_id):
        response = _validate(client, package_id, "approved")

    assert response.status_code == 201
    body = response.json()
    assert body["id"] == package_id
    assert body["status"] == "approved"
    assert client.get(f"/api/packages/{package_id}").json()["status"] == "approved"


def test_create_validation_rejected_with_observations_returns_201_and_rejects_package(
    client, as_user
):
    admin_id = _create_user(client, "admin", "ana@example.com")
    package_id = _create_package(client, admin_id)
    manager_id = _create_manager(client)

    with as_user(manager_id):
        response = _validate(client, package_id, "rejected", observations="Needs work")

    assert response.status_code == 201
    assert response.json()["status"] == "rejected"
    assert client.get(f"/api/packages/{package_id}").json()["status"] == "rejected"


def test_create_validation_rejected_without_observations_returns_422(client, as_user):
    admin_id = _create_user(client, "admin", "ana@example.com")
    package_id = _create_package(client, admin_id)
    manager_id = _create_manager(client)

    with as_user(manager_id):
        response = _validate(client, package_id, "rejected")

    assert response.status_code == 422
    assert client.get(f"/api/packages/{package_id}").json()["status"] == "pending"


def test_create_validation_returns_404_when_package_missing(client, as_user):
    manager_id = _create_manager(client)

    with as_user(manager_id):
        response = _validate(client, 999999, "approved")

    assert response.status_code == 404


def test_create_validation_forbidden_to_non_operations_manager(client, as_user):
    admin_id = _create_user(client, "admin", "ana@example.com")
    package_id = _create_package(client, admin_id)
    tourist_id = _create_user(client, "tourist", "tim@example.com", age=30)
    guide_id = _create_user(client, "guide", "lea@example.com", specialty="Nature")

    for user_id in (tourist_id, guide_id):
        with as_user(user_id):
            response = _validate(client, package_id, "approved")
            assert response.status_code == 403


def test_create_validation_requires_authentication(anonymous_client):
    response = anonymous_client.post(
        "/api/packages/1/validations", json={"result": "approved"}
    )

    assert response.status_code == 401


def test_create_validation_returns_409_when_package_already_validated(client, as_user):
    admin_id = _create_user(client, "admin", "ana@example.com")
    package_id = _create_package(client, admin_id)
    manager_id = _create_manager(client)

    with as_user(manager_id):
        first = _validate(client, package_id, "approved")
        assert first.status_code == 201
        # Pydantic exige observations en rejected; sin ellas sería 422 antes del servicio.
        second = _validate(client, package_id, "rejected", observations="Ya está validado")

    assert second.status_code == 409
    assert client.get(f"/api/packages/{package_id}").json()["status"] == "approved"


def test_create_validation_returns_409_when_package_rejected(client, as_user):
    admin_id = _create_user(client, "admin", "ana@example.com")
    package_id = _create_package(client, admin_id)
    manager_id = _create_manager(client)

    with as_user(manager_id):
        first = _validate(client, package_id, "rejected", observations="Needs work")
        assert first.status_code == 201
        second = _validate(client, package_id, "approved")

    assert second.status_code == 409
    assert client.get(f"/api/packages/{package_id}").json()["status"] == "rejected"

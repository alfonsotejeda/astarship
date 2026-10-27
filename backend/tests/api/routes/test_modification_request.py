"""Tests for the modification request routes."""


def _create_user(client, role, email, **fields) -> int:
    return client.post(
        "/api/users",
        json={"name": "Ada", "role": role, "email": email, "password": "x", **fields},
    ).json()["id"]


def _create_guide(client, email="gus@example.com") -> int:
    return _create_user(client, "guide", email, specialty="history")


def _create_assignment(client, tourist_email="ada@example.com") -> tuple[int, int]:
    itinerary_id = client.post(
        "/api/itineraries", json={"creation_date": "2026-01-01", "activity_count": 2}
    ).json()["id"]
    tourist_id = _create_user(client, "tourist", tourist_email, age=30)
    admin_id = _create_user(client, "admin", f"admin.{tourist_email}")
    client.post(
        f"/api/itineraries/{itinerary_id}/assignments/{tourist_id}", json={"admin_id": admin_id}
    )
    return itinerary_id, tourist_id


def _add_to_group(client, tourist_id, guide_id) -> None:
    travel_group_id = client.post(
        "/api/travel-groups", json={"name": "Group", "guide_id": guide_id}
    ).json()["id"]
    client.post(f"/api/travel-groups/{travel_group_id}/tourists/{tourist_id}")


def _url(itinerary_id, tourist_id) -> str:
    return f"/api/itineraries/{itinerary_id}/assignments/{tourist_id}/modification-requests"


def test_create_modification_request_returns_201(client):
    itinerary_id, tourist_id = _create_assignment(client)
    guide_id = _create_guide(client)

    response = client.post(
        _url(itinerary_id, tourist_id),
        json={
            "description": "Swap the museum",
            "guide_id": guide_id,
            "request_date": "2026-05-01T10:30:00",
        },
    )

    assert response.status_code == 201
    assert response.json() == {
        "itinerary_id": itinerary_id,
        "tourist_id": tourist_id,
        "guide_id": guide_id,
        "request_date": "2026-05-01T10:30:00",
        "description": "Swap the museum",
        "status": "requested",
        "result": None,
    }


def test_create_modification_request_defaults_to_the_travel_group_guide(client):
    itinerary_id, tourist_id = _create_assignment(client)
    guide_id = _create_guide(client)
    _add_to_group(client, tourist_id, guide_id)

    response = client.post(_url(itinerary_id, tourist_id), json={"description": "Swap it"})

    assert response.status_code == 201
    assert response.json()["guide_id"] == guide_id


def test_create_modification_request_lets_another_guide_support(client):
    itinerary_id, tourist_id = _create_assignment(client)
    _add_to_group(client, tourist_id, _create_guide(client, "gus@example.com"))
    support_id = _create_guide(client, "eva@example.com")

    response = client.post(
        _url(itinerary_id, tourist_id), json={"description": "Swap it", "guide_id": support_id}
    )

    assert response.status_code == 201
    assert response.json()["guide_id"] == support_id


def test_create_modification_request_without_default_guide_returns_422(client):
    itinerary_id, tourist_id = _create_assignment(client)

    response = client.post(_url(itinerary_id, tourist_id), json={"description": "Swap it"})

    assert response.status_code == 422


def test_create_modification_request_without_description_returns_422(client):
    itinerary_id, tourist_id = _create_assignment(client)
    guide_id = _create_guide(client)

    response = client.post(_url(itinerary_id, tourist_id), json={"guide_id": guide_id})

    assert response.status_code == 422


def test_create_modification_request_twice_returns_409(client):
    itinerary_id, tourist_id = _create_assignment(client)
    guide_id = _create_guide(client)
    payload = {"description": "Swap it", "guide_id": guide_id, "request_date": "2026-05-01T10:30"}
    client.post(_url(itinerary_id, tourist_id), json=payload)

    response = client.post(_url(itinerary_id, tourist_id), json=payload)

    assert response.status_code == 409


def test_create_modification_request_returns_404_when_assignment_missing(client):
    guide_id = _create_guide(client)

    response = client.post(_url(999999, 999999), json={"description": "x", "guide_id": guide_id})

    assert response.status_code == 404


def test_create_modification_request_returns_404_when_user_is_not_a_guide(client):
    itinerary_id, tourist_id = _create_assignment(client)

    response = client.post(
        _url(itinerary_id, tourist_id), json={"description": "Swap it", "guide_id": tourist_id}
    )

    assert response.status_code == 404


def test_list_modification_requests_returns_the_assignment_ones(client):
    itinerary_id, tourist_id = _create_assignment(client)
    guide_id = _create_guide(client)
    for request_date in ("2026-05-01T10:00:00", "2026-05-02T10:00:00"):
        client.post(
            _url(itinerary_id, tourist_id),
            json={"description": "Swap it", "guide_id": guide_id, "request_date": request_date},
        )

    response = client.get(_url(itinerary_id, tourist_id))

    assert response.status_code == 200
    assert {r["request_date"] for r in response.json()} == {
        "2026-05-01T10:00:00",
        "2026-05-02T10:00:00",
    }


def test_list_modification_requests_returns_404_when_assignment_missing(client):
    response = client.get(_url(999999, 999999))

    assert response.status_code == 404


def test_list_guide_modification_requests_returns_the_handled_ones(client):
    ada_assignment = _create_assignment(client, "ada@example.com")
    bob_assignment = _create_assignment(client, "bob@example.com")
    guide_id = _create_guide(client)
    for itinerary_id, tourist_id in (ada_assignment, bob_assignment):
        client.post(
            _url(itinerary_id, tourist_id), json={"description": "Swap it", "guide_id": guide_id}
        )

    response = client.get(f"/api/users/{guide_id}/modification-requests")

    assert response.status_code == 200
    assert {r["tourist_id"] for r in response.json()} == {ada_assignment[1], bob_assignment[1]}


def test_list_guide_modification_requests_returns_404_when_not_a_guide(client):
    _, tourist_id = _create_assignment(client)

    response = client.get(f"/api/users/{tourist_id}/modification-requests")

    assert response.status_code == 404


def test_update_modification_request_resolves_it(client):
    itinerary_id, tourist_id = _create_assignment(client)
    guide_id = _create_guide(client)
    created = client.post(
        _url(itinerary_id, tourist_id), json={"description": "Swap it", "guide_id": guide_id}
    ).json()
    item_url = f"{_url(itinerary_id, tourist_id)}/{guide_id}/{created['request_date']}"

    response = client.patch(item_url, json={"status": "resolved", "result": "Swapped"})

    assert response.status_code == 200
    assert response.json()["status"] == "resolved"
    assert response.json()["result"] == "Swapped"


def test_update_modification_request_with_unknown_status_returns_422(client):
    itinerary_id, tourist_id = _create_assignment(client)
    guide_id = _create_guide(client)
    client.post(
        _url(itinerary_id, tourist_id),
        json={"description": "Swap it", "guide_id": guide_id, "request_date": "2026-05-01T10:30"},
    )

    response = client.patch(
        f"{_url(itinerary_id, tourist_id)}/{guide_id}/2026-05-01T10:30:00", json={"status": "lost"}
    )

    assert response.status_code == 422


def test_update_modification_request_returns_404_when_missing(client):
    itinerary_id, tourist_id = _create_assignment(client)
    guide_id = _create_guide(client)

    response = client.patch(
        f"{_url(itinerary_id, tourist_id)}/{guide_id}/2026-05-01T10:30:00",
        json={"status": "denied"},
    )

    assert response.status_code == 404


def test_delete_modification_request_returns_204(client):
    itinerary_id, tourist_id = _create_assignment(client)
    guide_id = _create_guide(client)
    client.post(
        _url(itinerary_id, tourist_id),
        json={"description": "Swap it", "guide_id": guide_id, "request_date": "2026-05-01T10:30"},
    )

    response = client.delete(f"{_url(itinerary_id, tourist_id)}/{guide_id}/2026-05-01T10:30:00")

    assert response.status_code == 204
    assert client.get(_url(itinerary_id, tourist_id)).json() == []


def test_delete_modification_request_returns_404_when_missing(client):
    itinerary_id, tourist_id = _create_assignment(client)
    guide_id = _create_guide(client)

    response = client.delete(f"{_url(itinerary_id, tourist_id)}/{guide_id}/2026-05-01T10:30:00")

    assert response.status_code == 404

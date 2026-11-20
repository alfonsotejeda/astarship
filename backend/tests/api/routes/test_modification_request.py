"""Tests for the modification request routes."""

import pytest

from app.models.status import ItineraryStatus

ASSIGNMENT_DATE = "2026-03-01"
OTHER_DATE = "2026-04-01"


def _create_user(client, role, email, **fields) -> int:
    return client.post(
        "/api/users",
        json={"name": "Ada", "role": role, "email": email, "password": "x", **fields},
    ).json()["id"]


def _create_guide(client, email="gus@example.com") -> int:
    return _create_user(client, "guide", email, specialty="history")


def _add_to_group(client, tourist_id, guide_id) -> None:
    travel_group_id = client.post(
        "/api/travel-groups", json={"name": "Group", "guide_id": guide_id}
    ).json()["id"]
    client.post(f"/api/travel-groups/{travel_group_id}/tourists/{tourist_id}")


def _post_url(itinerary_id, tourist_id) -> str:
    return f"/api/itineraries/{itinerary_id}/assignments/{tourist_id}/modification-requests"


def _list_url(itinerary_id, tourist_id, assignment_date=ASSIGNMENT_DATE) -> str:
    return (
        f"/api/itineraries/{itinerary_id}/assignments/{tourist_id}/{assignment_date}"
        "/modification-requests"
    )


def _item_url(
    itinerary_id, tourist_id, guide_id, request_date, assignment_date=ASSIGNMENT_DATE
) -> str:
    return f"{_list_url(itinerary_id, tourist_id, assignment_date)}/{guide_id}/{request_date}"


@pytest.fixture
def create_assignment(client, create_itinerary):
    """Return a function that assigns a new itinerary to a new tourist."""

    def create(tourist_email="ada@example.com") -> tuple[int, int]:
        itinerary_id = create_itinerary(status=ItineraryStatus.APPROVED)
        tourist_id = _create_user(client, "tourist", tourist_email, age=30)
        admin_id = _create_user(client, "admin", f"admin.{tourist_email}")
        client.post(
            f"/api/itineraries/{itinerary_id}/assignments/{tourist_id}",
            json={"admin_id": admin_id, "assignment_date": ASSIGNMENT_DATE},
        )
        return itinerary_id, tourist_id

    return create


@pytest.fixture
def assign_again(client):
    """Return a function that assigns the same itinerary to the same tourist on another date."""

    def assign(itinerary_id, tourist_id, assignment_date=OTHER_DATE) -> None:
        admin_id = _create_user(client, "admin", f"admin.{assignment_date}@example.com")
        response = client.post(
            f"/api/itineraries/{itinerary_id}/assignments/{tourist_id}",
            json={"admin_id": admin_id, "assignment_date": assignment_date},
        )
        assert response.status_code == 201

    return assign


@pytest.fixture
def request_change(client, as_user):
    """Return a function that posts a modification request as the tourist of the assignment."""

    def post(itinerary_id, tourist_id, **payload):
        payload.setdefault("assignment_date", ASSIGNMENT_DATE)
        with as_user(tourist_id):
            return client.post(_post_url(itinerary_id, tourist_id), json=payload)

    return post


# create


def test_create_modification_request_returns_201(client, create_assignment, request_change):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)

    response = request_change(
        itinerary_id,
        tourist_id,
        description="Swap the museum",
        guide_id=guide_id,
        request_date="2026-05-01T10:30:00",
    )

    assert response.status_code == 201
    assert response.json() == {
        "itinerary_id": itinerary_id,
        "tourist_id": tourist_id,
        "guide_id": guide_id,
        "assignment_date": ASSIGNMENT_DATE,
        "request_date": "2026-05-01T10:30:00",
        "description": "Swap the museum",
        "status": "requested",
        "result": None,
    }


def test_create_modification_request_returns_403_for_another_tourist(
    client, as_user, create_assignment
):
    itinerary_id, tourist_id = create_assignment()
    other_tourist_id = _create_user(client, "tourist", "bob@example.com", age=40)
    guide_id = _create_guide(client)

    with as_user(other_tourist_id):
        response = client.post(
            _post_url(itinerary_id, tourist_id),
            json={"description": "x", "guide_id": guide_id, "assignment_date": ASSIGNMENT_DATE},
        )

    assert response.status_code == 403


def test_create_modification_request_returns_403_for_non_tourist(client, create_assignment):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)

    response = client.post(
        _post_url(itinerary_id, tourist_id),
        json={"description": "x", "guide_id": guide_id, "assignment_date": ASSIGNMENT_DATE},
    )

    assert response.status_code == 403


def test_create_modification_request_defaults_to_the_travel_group_guide(
    client, create_assignment, request_change
):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)
    _add_to_group(client, tourist_id, guide_id)

    response = request_change(itinerary_id, tourist_id, description="Swap it")

    assert response.status_code == 201
    assert response.json()["guide_id"] == guide_id


def test_create_modification_request_lets_another_guide_support(
    client, create_assignment, request_change
):
    itinerary_id, tourist_id = create_assignment()
    _add_to_group(client, tourist_id, _create_guide(client, "gus@example.com"))
    support_id = _create_guide(client, "eva@example.com")

    response = request_change(itinerary_id, tourist_id, description="Swap it", guide_id=support_id)

    assert response.status_code == 201
    assert response.json()["guide_id"] == support_id


def test_create_modification_request_without_default_guide_returns_422(
    create_assignment, request_change
):
    itinerary_id, tourist_id = create_assignment()

    response = request_change(itinerary_id, tourist_id, description="Swap it")

    assert response.status_code == 422


def test_create_modification_request_without_description_returns_422(
    client, create_assignment, request_change
):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)

    response = request_change(itinerary_id, tourist_id, guide_id=guide_id)

    assert response.status_code == 422


def test_create_modification_request_without_assignment_date_returns_422(
    client, as_user, create_assignment
):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)

    with as_user(tourist_id):
        response = client.post(
            _post_url(itinerary_id, tourist_id), json={"description": "x", "guide_id": guide_id}
        )

    assert response.status_code == 422


def test_create_modification_request_twice_returns_409(client, create_assignment, request_change):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)
    payload = {"description": "Swap it", "guide_id": guide_id, "request_date": "2026-05-01T10:30"}
    request_change(itinerary_id, tourist_id, **payload)

    response = request_change(itinerary_id, tourist_id, **payload)

    assert response.status_code == 409


def test_the_same_guide_can_receive_several_requests_of_an_assignment(
    client, create_assignment, request_change
):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)

    first = request_change(
        itinerary_id,
        tourist_id,
        description="One",
        guide_id=guide_id,
        request_date="2026-05-01T10:30",
    )
    second = request_change(
        itinerary_id,
        tourist_id,
        description="Two",
        guide_id=guide_id,
        request_date="2026-05-02T10:30",
    )

    assert first.status_code == 201
    assert second.status_code == 201


def test_create_modification_request_returns_404_when_assignment_missing(client, request_change):
    tourist_id = _create_user(client, "tourist", "ada@example.com", age=30)
    guide_id = _create_guide(client)

    response = request_change(999999, tourist_id, description="x", guide_id=guide_id)

    assert response.status_code == 404


def test_create_modification_request_returns_404_when_the_assignment_date_does_not_match(
    client, create_assignment, request_change
):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)

    response = request_change(
        itinerary_id,
        tourist_id,
        description="x",
        guide_id=guide_id,
        assignment_date="2020-01-01",
    )

    assert response.status_code == 404


def test_create_modification_request_returns_404_when_user_is_not_a_guide(
    create_assignment, request_change
):
    itinerary_id, tourist_id = create_assignment()

    response = request_change(itinerary_id, tourist_id, description="Swap it", guide_id=tourist_id)

    assert response.status_code == 404


# list


def test_list_modification_requests_returns_the_assignment_ones(
    client, create_assignment, request_change
):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)
    for request_date in ("2026-05-01T10:00:00", "2026-05-02T10:00:00"):
        request_change(
            itinerary_id,
            tourist_id,
            description="Swap it",
            guide_id=guide_id,
            request_date=request_date,
        )

    response = client.get(_list_url(itinerary_id, tourist_id))

    assert response.status_code == 200
    assert {r["request_date"] for r in response.json()} == {
        "2026-05-01T10:00:00",
        "2026-05-02T10:00:00",
    }


def test_list_modification_requests_only_returns_the_ones_of_that_assignment_date(
    client, create_assignment, assign_again, request_change
):
    itinerary_id, tourist_id = create_assignment()
    assign_again(itinerary_id, tourist_id)
    guide_id = _create_guide(client)
    request_change(
        itinerary_id,
        tourist_id,
        description="One",
        guide_id=guide_id,
        request_date="2026-05-01T10:00:00",
    )
    request_change(
        itinerary_id,
        tourist_id,
        description="Two",
        guide_id=guide_id,
        request_date="2026-05-02T10:00:00",
        assignment_date=OTHER_DATE,
    )

    response = client.get(_list_url(itinerary_id, tourist_id, OTHER_DATE))

    assert response.status_code == 200
    assert [r["description"] for r in response.json()] == ["Two"]


def test_list_modification_requests_returns_404_when_assignment_missing(client):
    response = client.get(_list_url(999999, 999999))

    assert response.status_code == 404


def test_list_modification_requests_returns_404_for_another_assignment_date(
    client, create_assignment
):
    itinerary_id, tourist_id = create_assignment()

    response = client.get(_list_url(itinerary_id, tourist_id, "2020-01-01"))

    assert response.status_code == 404


def test_list_modification_requests_with_invalid_date_returns_422(client, create_assignment):
    itinerary_id, tourist_id = create_assignment()

    response = client.get(_list_url(itinerary_id, tourist_id, "not-a-date"))

    assert response.status_code == 422


def test_list_guide_modification_requests_returns_the_handled_ones(
    client, create_assignment, request_change
):
    ada_assignment = create_assignment("ada@example.com")
    bob_assignment = create_assignment("bob@example.com")
    guide_id = _create_guide(client)
    for itinerary_id, tourist_id in (ada_assignment, bob_assignment):
        request_change(itinerary_id, tourist_id, description="Swap it", guide_id=guide_id)

    response = client.get(f"/api/users/{guide_id}/modification-requests")

    assert response.status_code == 200
    assert {r["tourist_id"] for r in response.json()} == {ada_assignment[1], bob_assignment[1]}


def test_list_guide_modification_requests_returns_404_when_not_a_guide(client, create_assignment):
    _, tourist_id = create_assignment()

    response = client.get(f"/api/users/{tourist_id}/modification-requests")

    assert response.status_code == 404


# update


def test_update_modification_request_resolves_it(
    client, as_user, create_assignment, request_change
):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)
    created = request_change(
        itinerary_id, tourist_id, description="Swap it", guide_id=guide_id
    ).json()
    item_url = _item_url(itinerary_id, tourist_id, guide_id, created["request_date"])

    with as_user(guide_id):
        response = client.patch(item_url, json={"status": "resolved", "result": "Swapped"})

    assert response.status_code == 200
    assert response.json()["status"] == "resolved"
    assert response.json()["result"] == "Swapped"


def test_update_modification_request_returns_403_for_another_guide(
    client, as_user, create_assignment, request_change
):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)
    other_guide_id = _create_guide(client, "eva@example.com")
    request_change(
        itinerary_id,
        tourist_id,
        description="Swap it",
        guide_id=guide_id,
        request_date="2026-05-01T10:30",
    )

    with as_user(other_guide_id):
        response = client.patch(
            _item_url(itinerary_id, tourist_id, guide_id, "2026-05-01T10:30:00"),
            json={"status": "resolved"},
        )

    assert response.status_code == 403


def test_update_modification_request_with_unknown_status_returns_422(
    client, as_user, create_assignment, request_change
):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)
    request_change(
        itinerary_id,
        tourist_id,
        description="Swap it",
        guide_id=guide_id,
        request_date="2026-05-01T10:30",
    )

    with as_user(guide_id):
        response = client.patch(
            _item_url(itinerary_id, tourist_id, guide_id, "2026-05-01T10:30:00"),
            json={"status": "lost"},
        )

    assert response.status_code == 422


def test_update_modification_request_returns_404_when_missing(client, as_user, create_assignment):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)

    with as_user(guide_id):
        response = client.patch(
            _item_url(itinerary_id, tourist_id, guide_id, "2026-05-01T10:30:00"),
            json={"status": "denied"},
        )

    assert response.status_code == 404


def test_update_modification_request_returns_404_for_another_assignment_date(
    client, as_user, create_assignment, request_change
):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)
    request_change(
        itinerary_id,
        tourist_id,
        description="Swap it",
        guide_id=guide_id,
        request_date="2026-05-01T10:30",
    )

    with as_user(guide_id):
        response = client.patch(
            _item_url(
                itinerary_id,
                tourist_id,
                guide_id,
                "2026-05-01T10:30:00",
                assignment_date=OTHER_DATE,
            ),
            json={"status": "resolved"},
        )

    assert response.status_code == 404


# delete


def test_delete_modification_request_returns_204(client, create_assignment, request_change):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)
    request_change(
        itinerary_id,
        tourist_id,
        description="Swap it",
        guide_id=guide_id,
        request_date="2026-05-01T10:30",
    )

    response = client.delete(_item_url(itinerary_id, tourist_id, guide_id, "2026-05-01T10:30:00"))

    assert response.status_code == 204
    assert client.get(_list_url(itinerary_id, tourist_id)).json() == []


def test_delete_modification_request_returns_404_when_missing(client, create_assignment):
    itinerary_id, tourist_id = create_assignment()
    guide_id = _create_guide(client)

    response = client.delete(_item_url(itinerary_id, tourist_id, guide_id, "2026-05-01T10:30:00"))

    assert response.status_code == 404

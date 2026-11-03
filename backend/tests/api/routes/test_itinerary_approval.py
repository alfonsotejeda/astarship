"""Tests for the itinerary approval routes."""

import pytest

from app.models.itinerary import Itinerary
from app.models.status import ItineraryStatus


@pytest.fixture
def validated_itinerary(db_session, create_itinerary):
    def create(status=ItineraryStatus.VALIDATED) -> int:
        itinerary_id = create_itinerary()
        db_session.get(Itinerary, itinerary_id).status = status
        db_session.commit()
        return itinerary_id

    return create


def _create_user(client, role, email, **fields) -> int:
    return client.post(
        "/api/users",
        json={"name": "Olga", "role": role, "email": email, "password": "x", **fields},
    ).json()["id"]


def _create_manager(client, email="olga@example.com") -> int:
    return _create_user(client, "operations_manager", email)


def _url(itinerary_id: int) -> str:
    return f"/api/itineraries/{itinerary_id}/approvals"


def _status(client, itinerary_id: int) -> str:
    return client.get(f"/api/itineraries/{itinerary_id}").json()["status"]


def test_create_approval_returns_201_and_approves_the_itinerary(client, validated_itinerary):
    itinerary_id = validated_itinerary()
    manager_id = _create_manager(client)

    response = client.post(
        _url(itinerary_id), json={"manager_id": manager_id, "result": "approved"}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["itinerary_id"] == itinerary_id
    assert body["manager_id"] == manager_id
    assert body["result"] == "approved"
    assert body["observations"] is None
    assert body["approval_date"]
    assert _status(client, itinerary_id) == "approved"


def test_create_rejection_rejects_the_itinerary(client, validated_itinerary):
    itinerary_id = validated_itinerary()
    manager_id = _create_manager(client)

    response = client.post(
        _url(itinerary_id),
        json={"manager_id": manager_id, "result": "rejected", "observations": "Redo it"},
    )

    assert response.status_code == 201
    assert response.json()["observations"] == "Redo it"
    assert _status(client, itinerary_id) == "rejected"


def test_manager_can_approve_as_themselves(client, as_user, validated_itinerary):
    itinerary_id = validated_itinerary()
    manager_id = _create_manager(client)

    with as_user(manager_id):
        response = client.post(
            _url(itinerary_id), json={"manager_id": manager_id, "result": "approved"}
        )

    assert response.status_code == 201


def test_manager_cannot_approve_as_another_manager_returns_403(
    client, as_user, validated_itinerary
):
    itinerary_id = validated_itinerary()
    manager_id = _create_manager(client)
    other_id = _create_manager(client, "otto@example.com")

    with as_user(other_id):
        response = client.post(
            _url(itinerary_id), json={"manager_id": manager_id, "result": "approved"}
        )

    assert response.status_code == 403
    assert _status(client, itinerary_id) == "validated"


@pytest.mark.parametrize(
    "status", [ItineraryStatus.PENDING, ItineraryStatus.APPROVED, ItineraryStatus.REJECTED]
)
def test_create_approval_of_non_validated_itinerary_returns_409(
    client, validated_itinerary, status
):
    itinerary_id = validated_itinerary(status)
    manager_id = _create_manager(client)

    response = client.post(
        _url(itinerary_id), json={"manager_id": manager_id, "result": "approved"}
    )

    assert response.status_code == 409
    assert _status(client, itinerary_id) == status


def test_create_approval_of_missing_itinerary_returns_404(client):
    manager_id = _create_manager(client)

    response = client.post(_url(999), json={"manager_id": manager_id, "result": "approved"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Itinerary not found"


def test_create_approval_by_non_manager_returns_404(client, validated_itinerary):
    itinerary_id = validated_itinerary()
    admin_id = _create_user(client, "admin", "ana@example.com")

    response = client.post(_url(itinerary_id), json={"manager_id": admin_id, "result": "approved"})

    assert response.status_code == 404
    assert response.json()["detail"] == "Operations manager not found"


@pytest.mark.parametrize(
    "payload",
    [
        {"result": "approved"},
        {"manager_id": 1},
        {"manager_id": 1, "result": "validated"},
        {"manager_id": 1, "result": "rejected"},
    ],
)
def test_create_approval_with_invalid_payload_returns_422(client, validated_itinerary, payload):
    itinerary_id = validated_itinerary()

    response = client.post(_url(itinerary_id), json=payload)

    assert response.status_code == 422


def test_list_approvals_returns_the_decisions_oldest_first(
    client, db_session, validated_itinerary
):
    itinerary_id = validated_itinerary()
    manager_id = _create_manager(client)
    client.post(
        _url(itinerary_id),
        json={"manager_id": manager_id, "result": "rejected", "observations": "Redo it"},
    )
    db_session.get(Itinerary, itinerary_id).status = ItineraryStatus.VALIDATED
    db_session.commit()
    client.post(_url(itinerary_id), json={"manager_id": manager_id, "result": "approved"})

    response = client.get(_url(itinerary_id))

    assert response.status_code == 200
    assert [item["result"] for item in response.json()] == ["rejected", "approved"]


def test_list_approvals_of_missing_itinerary_returns_404(client):
    response = client.get(_url(999))

    assert response.status_code == 404


def test_approvals_require_authentication(anonymous_client):
    response = anonymous_client.get(_url(1))

    assert response.status_code == 401

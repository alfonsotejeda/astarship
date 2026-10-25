"""Tests for the itinerary validation routes."""

from datetime import UTC, date, datetime

import pytest

from app.models.authorization import Authorization
from app.models.itinerary import Itinerary
from app.models.itinerary_validation import ItineraryValidation
from app.models.package import Package
from app.models.status import ItineraryStatus
from app.models.user.guide import Guide
from app.models.user.user import User

API = "/api"  # quita "/api" si tus otras rutas no lo usan


def url(itinerary_id: int) -> str:
    """Return the validations URL of an itinerary."""
    return f"{API}/itineraries/{itinerary_id}/validations"


def make_guide(db_session, number: int) -> Guide:
    """Create a user and the guide that extends it."""
    user = User(
        name=f"Guide {number}",
        email=f"guide{number}@test.com",
        password_hash="hash",
    )
    db_session.add(user)
    db_session.flush()
    guide = Guide(id=user.id, specialty="History")
    db_session.add(guide)
    db_session.flush()
    return guide


@pytest.fixture
def sample_data(db_session):
    """Create a package, three guides and three itineraries."""
    g1, g2, creator = (make_guide(db_session, n) for n in (1, 2, 3))
    package = Package(name="Havana", destination="Cuba")
    db_session.add(package)
    db_session.flush()

    def itinerary(pkg):
        return Itinerary(
            creation_date=date(2026, 10, 1),
            activity_count=3,
            package_id=pkg.id if pkg else None,
            creator_id=creator.id,
        )

    with_validations = itinerary(package)
    empty = itinerary(package)
    no_package = itinerary(None)
    db_session.add_all([with_validations, empty, no_package])
    db_session.flush()

    db_session.add_all(
        [
            ItineraryValidation(
                itinerary_id=with_validations.id,
                guide_id=g2.id,
                validation_date=datetime(2026, 10, 2, 10, 0, tzinfo=UTC),
                result=False,
                observations="Too long",
            ),
            ItineraryValidation(
                itinerary_id=with_validations.id,
                guide_id=g1.id,
                validation_date=datetime(2026, 10, 1, 10, 0, tzinfo=UTC),
                result=True,
            ),
        ]
    )
    db_session.commit()
    return {
        "g1": g1, "g2": g2, "creator": creator, "package": package,
        "with_validations": with_validations, "empty": empty, "no_package": no_package,
    }  # fmt: skip


def authorize(db_session, guide, package, can_validate=True):
    """Grant a guide the right to validate itineraries of a package."""
    db_session.add(
        Authorization(guide_id=guide.id, package_id=package.id, can_validate=can_validate)
    )
    db_session.commit()


# ---------- GET /itineraries/{id}/validations ----------


def test_list_validations_oldest_first(client, sample_data):
    """The validations are returned ordered by date."""
    d = sample_data

    response = client.get(url(d["with_validations"].id))

    assert response.status_code == 200
    body = response.json()
    assert [item["guide_id"] for item in body] == [d["g1"].id, d["g2"].id]
    assert [item["result"] for item in body] == [True, False]
    assert body[1]["observations"] == "Too long"
    assert body[0]["observations"] is None
    assert {"itinerary_id", "guide_id", "validation_date", "result"} <= set(body[0])


def test_list_validations_empty(client, sample_data):
    """An itinerary without validations returns an empty list."""
    response = client.get(url(sample_data["empty"].id))

    assert response.status_code == 200
    assert response.json() == []


def test_list_validations_itinerary_not_found(client, sample_data):
    """An unknown itinerary returns 404."""
    response = client.get(url(99999))

    assert response.status_code == 404
    assert "itinerary not found" in response.json()["detail"].lower()


# ---------- POST /itineraries/{id}/validations ----------


def test_create_validation_itinerary_not_found(client, sample_data):
    """An unknown itinerary returns 404."""
    response = client.post(url(99999), json={"guide_id": sample_data["g1"].id, "result": True})

    assert response.status_code == 404
    assert "itinerary not found" in response.json()["detail"].lower()


def test_create_validation_guide_not_found(client, sample_data):
    """An unknown guide returns 404."""
    response = client.post(
        url(sample_data["empty"].id), json={"guide_id": 99999, "result": True}
    )

    assert response.status_code == 404
    assert "guide not found" in response.json()["detail"].lower()


def test_create_validation_by_the_creator(client, sample_data):
    """The guide who generated the itinerary gets 403."""
    d = sample_data

    response = client.post(
        url(d["empty"].id), json={"guide_id": d["creator"].id, "result": True}
    )

    assert response.status_code == 403
    assert "generated" in response.json()["detail"].lower()


def test_create_validation_itinerary_without_package(client, sample_data):
    """An itinerary without package returns 409."""
    d = sample_data

    response = client.post(
        url(d["no_package"].id), json={"guide_id": d["g1"].id, "result": True}
    )

    assert response.status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        {"result": True},
        {"guide_id": 1},
        {"guide_id": "abc", "result": True},
        {"guide_id": 1, "result": "texto"},
    ],
)
def test_create_validation_invalid_payload(client, sample_data, payload):
    """Missing or wrongly typed fields return 422."""
    response = client.post(url(sample_data["empty"].id), json=payload)

    assert response.status_code == 422


# ---------- POST cases that need an Authorization ----------


def test_create_validation_approved(client, db_session, sample_data):
    """An approved validation returns 201 and marks the itinerary as validated."""
    d = sample_data
    authorize(db_session, d["g1"], d["package"])

    response = client.post(
        url(d["empty"].id),
        json={"guide_id": d["g1"].id, "result": True, "observations": "Looks good"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["itinerary_id"] == d["empty"].id
    assert body["guide_id"] == d["g1"].id
    assert body["result"] is True
    assert body["observations"] == "Looks good"
    assert body["validation_date"]
    db_session.refresh(d["empty"])
    assert d["empty"].status == ItineraryStatus.VALIDATED


def test_create_validation_is_listed_afterwards(client, db_session, sample_data):
    """A created validation appears in the GET list."""
    d = sample_data
    authorize(db_session, d["g1"], d["package"])
    client.post(url(d["empty"].id), json={"guide_id": d["g1"].id, "result": False})

    response = client.get(url(d["empty"].id))

    assert [item["result"] for item in response.json()] == [False]


def test_create_validation_rejected(client, db_session, sample_data):
    """A rejected validation marks the itinerary as rejected."""
    d = sample_data
    authorize(db_session, d["g1"], d["package"])
    d["empty"].status = ItineraryStatus.VALIDATED
    db_session.commit()

    response = client.post(
        url(d["empty"].id), json={"guide_id": d["g1"].id, "result": False}
    )

    assert response.status_code == 201
    assert response.json()["result"] is False
    db_session.refresh(d["empty"])
    assert d["empty"].status == ItineraryStatus.REJECTED


def test_create_validation_without_authorization(client, sample_data):
    """A guide without authorization on the package gets 403."""
    d = sample_data

    response = client.post(
        url(d["empty"].id), json={"guide_id": d["g1"].id, "result": True}
    )

    assert response.status_code == 403
    assert "cannot validate" in response.json()["detail"].lower()


def test_create_validation_without_can_validate(client, db_session, sample_data):
    """An authorization with can_validate=False is not enough."""
    d = sample_data
    authorize(db_session, d["g1"], d["package"], can_validate=False)

    response = client.post(
        url(d["empty"].id), json={"guide_id": d["g1"].id, "result": True}
    )

    assert response.status_code == 403
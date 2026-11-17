"""Tests for the business rule checks."""

import pytest
from fastapi import HTTPException

from app.api.deps.rules import (
    forbid_acting_for_others,
    forbid_self_review,
    get_approved_package,
    require_itinerary_author,
)
from app.models.itinerary import Itinerary
from app.models.status import ReviewStatus


def test_get_approved_package_raises_404_for_missing_package(db_session):
    with pytest.raises(HTTPException) as error:
        get_approved_package(db_session, 999)

    assert error.value.status_code == 404


def test_get_approved_package_raises_409_while_pending(db_session, package):
    with pytest.raises(HTTPException) as error:
        get_approved_package(db_session, package.id)

    assert error.value.status_code == 409


def test_get_approved_package_returns_approved_package(db_session, package):
    package.status = ReviewStatus.APPROVED
    db_session.commit()

    assert get_approved_package(db_session, package.id) is package


def test_forbid_self_review_rejects_own_work(users):
    with pytest.raises(HTTPException) as error:
        forbid_self_review(users["guide"], users["guide"].id)

    assert error.value.status_code == 403


def test_forbid_self_review_allows_someone_else(users):
    forbid_self_review(users["guide"], users["admin"].id)
    forbid_self_review(users["guide"], None)


def test_forbid_acting_for_others_allows_own_records(users):
    forbid_acting_for_others(users["tourist"], users["tourist"].id)


def test_forbid_acting_for_others_rejects_records_of_someone_else(users):
    with pytest.raises(HTTPException) as error:
        forbid_acting_for_others(users["tourist"], users["guide"].id)

    assert error.value.status_code == 403


def test_forbid_acting_for_others_lets_admins_act_on_any_record(users):
    forbid_acting_for_others(users["admin"], users["tourist"].id)


@pytest.fixture
def itinerary(db_session, users, package):
    itinerary = Itinerary(
        creation_date=package.creation_date,
        activity_count=1,
        package_id=package.id,
        guide_id=users["guide"].id,
    )
    db_session.add(itinerary)
    db_session.commit()
    return itinerary


def test_require_itinerary_author_raises_404_for_missing_itinerary(db_session, users):
    with pytest.raises(HTTPException) as error:
        require_itinerary_author(999, users["guide"], db_session)

    assert error.value.status_code == 404


def test_require_itinerary_author_lets_the_author_through(db_session, users, itinerary):
    assert require_itinerary_author(itinerary.id, users["guide"], db_session) is users["guide"]


def test_require_itinerary_author_rejects_someone_else(db_session, users, itinerary):
    with pytest.raises(HTTPException) as error:
        require_itinerary_author(itinerary.id, users["tourist"], db_session)

    assert error.value.status_code == 403

"""Tests for the business rule checks."""

import pytest
from fastapi import HTTPException

from app.api.deps.rules import forbid_self_review, get_approved_package
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

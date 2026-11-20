"""Tests for the itinerary approval schemas."""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.models.itinerary_approval import ItineraryApproval
from app.models.status import ApprovalResult
from app.schemas.itinerary_approval import ItineraryApprovalCreate, ItineraryApprovalRead


def test_create_approved_without_observations():
    data = ItineraryApprovalCreate(manager_id=1, result="approved")

    assert data.result is ApprovalResult.APPROVED
    assert data.observations is None


def test_create_rejected_with_observations():
    data = ItineraryApprovalCreate(manager_id=1, result="rejected", observations="Redo it")

    assert data.result is ApprovalResult.REJECTED
    assert data.observations == "Redo it"


@pytest.mark.parametrize(
    "payload",
    [
        {"result": "approved"},
        {"manager_id": 1},
        {"manager_id": "abc", "result": "approved"},
        {"manager_id": 1, "result": "validated"},
        {"manager_id": 1, "result": "rejected"},
        {"manager_id": 1, "result": "rejected", "observations": ""},
    ],
)
def test_create_rejects_invalid_payloads(payload):
    with pytest.raises(ValidationError):
        ItineraryApprovalCreate(**payload)


def test_read_from_model():
    approval = ItineraryApproval(
        itinerary_id=1,
        manager_id=2,
        approval_date=datetime(2026, 10, 1, 10, 0, tzinfo=UTC),
        result=ApprovalResult.REJECTED,
        observations="Redo it",
    )

    data = ItineraryApprovalRead.model_validate(approval)

    assert data.model_dump() == {
        "itinerary_id": 1,
        "manager_id": 2,
        "approval_date": datetime(2026, 10, 1, 10, 0, tzinfo=UTC),
        "result": ApprovalResult.REJECTED,
        "observations": "Redo it",
    }

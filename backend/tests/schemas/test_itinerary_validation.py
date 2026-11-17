"""Tests for the itinerary validation schemas."""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.models.itinerary_validation import ItineraryValidation
from app.schemas.itinerary_validation import (
    ItineraryValidationCreate,
    ItineraryValidationRead,
)


def test_create_with_all_fields():
    """A complete payload is accepted."""
    data = ItineraryValidationCreate(guide_id=1, result=False, observations="Too long")

    assert data.guide_id == 1
    assert data.result is False
    assert data.observations == "Too long"


def test_create_observations_are_optional():
    """Observations default to None."""
    data = ItineraryValidationCreate(guide_id=1, result=True)

    assert data.observations is None


@pytest.mark.parametrize(
    "payload",
    [
        {"result": True},
        {"guide_id": 1},
        {"guide_id": "abc", "result": True},
        {"guide_id": 1, "result": "texto"},
    ],
)
def test_create_rejects_invalid_payloads(payload):
    """Missing or wrongly typed fields raise ValidationError."""
    with pytest.raises(ValidationError):
        ItineraryValidationCreate(**payload)


def test_read_from_model():
    """The read schema can be built from an ORM object."""
    row = ItineraryValidation(
        itinerary_id=1,
        guide_id=2,
        validation_date=datetime(2026, 10, 1, 10, 0, tzinfo=UTC),
        result=True,
        observations=None,
    )

    data = ItineraryValidationRead.model_validate(row)

    assert data.itinerary_id == 1
    assert data.guide_id == 2
    assert data.validation_date == datetime(2026, 10, 1, 10, 0, tzinfo=UTC)
    assert data.result is True
    assert data.observations is None
"""Tests for the visit schemas."""

import pytest
from pydantic import ValidationError

from app.models.visit import Visit
from app.schemas.visit import VisitCreated, VisitRead, VisitUpdate

KEYS = {"itinerary_id": 1, "tourist_id": 2, "activity_id": 3}


def test_create_accepts_a_done_visit_with_rating():
    visit = VisitCreated(**KEYS, status="done", rating=4, comment="Great")

    assert visit.rating == 4
    assert visit.comment == "Great"


def test_create_accepts_a_skipped_visit_without_rating():
    visit = VisitCreated(**KEYS, status="skipped")

    assert visit.rating is None
    assert visit.comment is None


def test_create_rejects_a_done_visit_without_rating():
    with pytest.raises(ValidationError):
        VisitCreated(**KEYS, status="done")


@pytest.mark.parametrize("status", ["pending", "cancelled", ""])
def test_create_rejects_unknown_status(status):
    with pytest.raises(ValidationError):
        VisitCreated(**KEYS, status=status, rating=3)


@pytest.mark.parametrize("rating", [0, 6, -1])
def test_create_rejects_rating_out_of_range(rating):
    with pytest.raises(ValidationError):
        VisitCreated(**KEYS, status="done", rating=rating)


def test_create_limits_the_comment_to_255_characters():
    VisitCreated(**KEYS, status="skipped", comment="x" * 255)

    with pytest.raises(ValidationError):
        VisitCreated(**KEYS, status="skipped", comment="x" * 256)


@pytest.mark.parametrize("field", ["itinerary_id", "tourist_id", "activity_id", "status"])
def test_create_requires_the_keys_and_the_status(field):
    data = {**KEYS, "status": "skipped"}
    del data[field]

    with pytest.raises(ValidationError):
        VisitCreated(**data)


def test_update_fields_are_all_optional():
    assert VisitUpdate().model_dump(exclude_unset=True) == {}


def test_update_rejects_a_null_status():
    with pytest.raises(ValidationError):
        VisitUpdate(status=None)


def test_update_accepts_a_null_rating_to_clear_it():
    assert VisitUpdate(rating=None).model_dump(exclude_unset=True) == {"rating": None}


def test_update_rejects_unknown_status_and_bad_rating():
    with pytest.raises(ValidationError):
        VisitUpdate(status="pending")
    with pytest.raises(ValidationError):
        VisitUpdate(rating=6)


def test_read_from_model():
    visit = Visit(
        itinerary_id=1, tourist_id=2, activity_id=3, status="done", rating=5, comment=None
    )

    read = VisitRead.model_validate(visit)

    assert (read.itinerary_id, read.tourist_id, read.activity_id) == (1, 2, 3)
    assert read.status == "done"
    assert read.rating == 5
    assert read.comment is None

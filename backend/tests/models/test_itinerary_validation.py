"""Tests for the ItineraryValidation model."""

from datetime import UTC, date, datetime

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.models.itinerary import Itinerary
from app.models.itinerary_validation import ItineraryValidation
from app.models.user.guide import Guide
from app.models.user.user import User


@pytest.fixture
def base(db_session):
    """Create a guide and an itinerary."""
    user = User(name="Guide", email="guide@test.com", password_hash="hash")
    db_session.add(user)
    db_session.flush()
    guide = Guide(id=user.id, specialty="History")
    itinerary = Itinerary(creation_date=date(2026, 10, 1), activity_count=3)
    db_session.add_all([guide, itinerary])
    db_session.commit()
    return {"guide": guide, "itinerary": itinerary}


def count_validations(db_session) -> int:
    """Return how many validations exist."""
    return db_session.scalar(select(func.count()).select_from(ItineraryValidation))


def test_create_validation_sets_defaults(db_session, base):
    """The date is generated and observations are optional."""
    row = ItineraryValidation(
        itinerary_id=base["itinerary"].id, guide_id=base["guide"].id, result=True
    )
    db_session.add(row)
    db_session.commit()
    db_session.refresh(row)

    assert row.validation_date is not None
    assert row.observations is None
    assert row.result is True


def test_same_guide_can_validate_again_on_another_date(db_session, base):
    """The date is part of the key, so the history keeps both rows."""
    for day in (1, 2):
        db_session.add(
            ItineraryValidation(
                itinerary_id=base["itinerary"].id,
                guide_id=base["guide"].id,
                validation_date=datetime(2026, 10, day, tzinfo=UTC),
                result=day == 2,
            )
        )
    db_session.commit()

    assert count_validations(db_session) == 2


def test_duplicate_primary_key_is_rejected(db_session, base):
    """The same itinerary, guide and date cannot be stored twice."""
    when = datetime(2026, 10, 1, tzinfo=UTC)
    db_session.add(
        ItineraryValidation(
            itinerary_id=base["itinerary"].id,
            guide_id=base["guide"].id,
            validation_date=when,
            result=True,
        )
    )
    db_session.commit()

    db_session.add(
        ItineraryValidation(
            itinerary_id=base["itinerary"].id,
            guide_id=base["guide"].id,
            validation_date=when,
            result=False,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()
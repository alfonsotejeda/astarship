"""Tests for the itinerary validation service."""

from datetime import UTC, date, datetime

import pytest

from app.models.authorization import Authorization
from app.models.itinerary import Itinerary
from app.models.itinerary_validation import ItineraryValidation
from app.models.package import Package
from app.models.status import ItineraryStatus
from app.models.user.guide import Guide
from app.models.user.user import User
from app.schemas.itinerary_validation import ItineraryValidationCreate
from app.services import itinerary_validation as service


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


def make_itinerary(package, creator) -> Itinerary:
    """Build an itinerary of a package (or none) created by a guide."""
    return Itinerary(
        creation_date=date(2026, 10, 1),
        activity_count=3,
        package_id=package.id if package else None,
        creator_id=creator.id,
    )


def make_validation(itinerary, guide, day: int, result: bool, observations=None):
    """Build a validation made on the given day of October 2026."""
    return ItineraryValidation(
        itinerary_id=itinerary.id,
        guide_id=guide.id,
        validation_date=datetime(2026, 10, day, 10, 0, tzinfo=UTC),
        result=result,
        observations=observations,
    )


def pairs(validations) -> list[tuple[int, int]]:
    """Return (itinerary_id, guide_id) for each validation."""
    return [(v.itinerary_id, v.guide_id) for v in validations]


def authorize(db_session, guide, package, can_validate=True):
    """Grant a guide the right to validate itineraries of a package."""
    db_session.add(
        Authorization(guide_id=guide.id, package_id=package.id, can_validate=can_validate)
    )
    db_session.commit()


@pytest.fixture
def sample_data(db_session):
    """Create guides, packages, itineraries and validations.

    Validations (day, itinerary, guide, result):
      1: it1, g1, approved   2: it1, g2, rejected   3: it2, g1, rejected
      4: it3, g2, approved   5: it4, g1, approved   6: it1, g1, approved
    """
    g1, g2, g3 = (make_guide(db_session, n) for n in (1, 2, 3))
    pkg1 = Package(name="Havana", destination="Cuba")
    pkg2 = Package(name="Trinidad", destination="Cuba")
    pkg3 = Package(name="Empty", destination="Cuba")
    db_session.add_all([pkg1, pkg2, pkg3])
    db_session.flush()

    it1 = make_itinerary(pkg1, g3)
    it2 = make_itinerary(pkg1, g3)
    it3 = make_itinerary(pkg2, g3)
    it4 = make_itinerary(None, g3)
    it5 = make_itinerary(pkg2, g3)  # without validations
    db_session.add_all([it1, it2, it3, it4, it5])
    db_session.flush()

    db_session.add_all(
        [
            make_validation(it1, g1, 1, True),
            make_validation(it1, g2, 2, False, "Too long"),
            make_validation(it2, g1, 3, False, "Missing lunch"),
            make_validation(it3, g2, 4, True),
            make_validation(it4, g1, 5, True),
            make_validation(it1, g1, 6, True, "Re-checked"),
        ]
    )
    db_session.commit()
    return {
        "g1": g1, "g2": g2, "g3": g3,
        "pkg1": pkg1, "pkg2": pkg2, "pkg3": pkg3,
        "it1": it1, "it2": it2, "it3": it3, "it4": it4, "it5": it5,
    }  # fmt: skip


# 1) validations by itinerary
def test_validations_by_itinerary_oldest_first(db_session, sample_data):
    """Returns every validation of the itinerary ordered by date."""
    d = sample_data
    result = service.validations_by_itinerary(d["it1"].id, db_session)

    assert [v.guide_id for v in result] == [d["g1"].id, d["g2"].id, d["g1"].id]
    dates = [v.validation_date for v in result]
    assert dates == sorted(dates)


def test_validations_by_itinerary_without_validations(db_session, sample_data):
    """An itinerary without validations returns an empty list."""
    assert service.validations_by_itinerary(sample_data["it5"].id, db_session) == []


def test_validations_by_itinerary_not_found(db_session, sample_data):
    """An unknown itinerary raises LookupError."""
    with pytest.raises(LookupError, match="Itinerary not found"):
        service.validations_by_itinerary(99999, db_session)


# 2) validations by guide
def test_validations_by_guide(db_session, sample_data):
    """Returns only the validations made by the guide, oldest first."""
    d = sample_data
    result = service.itinerary_by_guide(d["g1"].id, db_session)

    assert pairs(result) == [
        (d["it1"].id, d["g1"].id),
        (d["it2"].id, d["g1"].id),
        (d["it4"].id, d["g1"].id),
        (d["it1"].id, d["g1"].id),
    ]


def test_validations_by_guide_without_validations(db_session, sample_data):
    """A guide that never validated returns an empty list."""
    assert service.itinerary_by_guide(sample_data["g3"].id, db_session) == []


def test_validations_by_guide_not_found(db_session, sample_data):
    """An unknown guide raises LookupError."""
    with pytest.raises(LookupError, match="Guide not found"):
        service.itinerary_by_guide(99999, db_session)


# 3) rejected validations
def test_rejected_validations(db_session, sample_data):
    """Returns only rejected validations ordered by guide."""
    d = sample_data
    result = service.get_rejected_validations(db_session)

    assert pairs(result) == [(d["it2"].id, d["g1"].id), (d["it1"].id, d["g2"].id)]
    assert all(v.result is False for v in result)


# 4) validations between two dates
def test_validations_between_includes_both_ends(db_session, sample_data):
    """The range is inclusive on both ends."""
    d = sample_data
    start = datetime(2026, 10, 2, 10, 0, tzinfo=UTC)
    end = datetime(2026, 10, 4, 10, 0, tzinfo=UTC)

    result = service.get_validations_between(start, end, db_session)

    assert pairs(result) == [
        (d["it1"].id, d["g2"].id),
        (d["it2"].id, d["g1"].id),
        (d["it3"].id, d["g2"].id),
    ]


def test_validations_between_empty_range(db_session, sample_data):
    """A range without validations returns an empty list."""
    start = datetime(2025, 1, 1, tzinfo=UTC)
    end = datetime(2025, 12, 31, tzinfo=UTC)

    assert service.get_validations_between(start, end, db_session) == []


# 5) itineraries validated by a guide, with their package
def test_itineraries_by_guide_with_package(db_session, sample_data):
    """Returns each itinerary once, with its package or None."""
    d = sample_data
    rows = service.get_itineraries_by_guide(d["g1"].id, db_session)

    found = {(i.id, p.id if p else None) for i, p in rows}
    assert len(rows) == 3  # it1 was validated twice but appears once
    assert found == {
        (d["it1"].id, d["pkg1"].id),
        (d["it2"].id, d["pkg1"].id),
        (d["it4"].id, None),
    }


def test_itineraries_by_guide_without_validations(db_session, sample_data):
    """A guide that never validated returns an empty list."""
    assert service.get_itineraries_by_guide(sample_data["g3"].id, db_session) == []


def test_itineraries_by_guide_not_found(db_session, sample_data):
    """An unknown guide raises LookupError."""
    with pytest.raises(LookupError, match="Guide not found"):
        service.get_itineraries_by_guide(99999, db_session)


# 6) validations of the itineraries of a package
def test_validations_by_package(db_session, sample_data):
    """Returns the validations of the itineraries of the package, oldest first."""
    d = sample_data
    result = service.itineraries_by_package(d["pkg1"].id, db_session)

    assert pairs(result) == [
        (d["it1"].id, d["g1"].id),
        (d["it1"].id, d["g2"].id),
        (d["it2"].id, d["g1"].id),
        (d["it1"].id, d["g1"].id),
    ]


def test_validations_by_package_without_itineraries(db_session, sample_data):
    """A package without validated itineraries returns an empty list."""
    assert service.itineraries_by_package(sample_data["pkg3"].id, db_session) == []


def test_validations_by_package_not_found(db_session, sample_data):
    """An unknown package raises LookupError."""
    with pytest.raises(LookupError, match="Package not found"):
        service.itineraries_by_package(99999, db_session)


# 7) guides that validated itineraries of a package
def test_guides_by_package(db_session, sample_data):
    """Returns each guide once."""
    d = sample_data
    result = service.validation_itinerary_guide_package(d["pkg1"].id, db_session)

    assert sorted(g.id for g in result) == sorted([d["g1"].id, d["g2"].id])


def test_guides_by_package_single_guide(db_session, sample_data):
    """Only the guides that validated that package appear."""
    d = sample_data
    result = service.validation_itinerary_guide_package(d["pkg2"].id, db_session)

    assert [g.id for g in result] == [d["g2"].id]


def test_guides_by_package_without_validations(db_session, sample_data):
    """A package without validations returns an empty list."""
    result = service.validation_itinerary_guide_package(sample_data["pkg3"].id, db_session)

    assert result == []


def test_guides_by_package_not_found(db_session, sample_data):
    """An unknown package raises LookupError."""
    with pytest.raises(LookupError, match="Package not found"):
        service.validation_itinerary_guide_package(99999, db_session)


# 8) approval rate by guide
def test_approval_rate_by_guide(db_session, sample_data):
    """Percentage of approved validations per guide."""
    d = sample_data

    assert service.approval_rate_by_guide(db_session) == [
        (d["g1"].id, 75.0),
        (d["g2"].id, 50.0),
    ]


# 9) validation count by guide
def test_validation_count_by_guide(db_session, sample_data):
    """Number of validations of each guide that validated something."""
    d = sample_data

    assert service.validation_count_by_guide(db_session) == [
        (d["g1"].id, 4),
        (d["g2"].id, 2),
    ]


# 10) validation count by itinerary
def test_validation_count_by_itinerary(db_session, sample_data):
    """Number of validations of each itinerary that has any."""
    d = sample_data

    assert service.validation_count_by_itinerary(db_session) == [
        (d["it1"].id, 3),
        (d["it2"].id, 1),
        (d["it3"].id, 1),
        (d["it4"].id, 1),
    ]


# 11) create a validation
def test_create_validation_itinerary_not_found(db_session, sample_data):
    """An unknown itinerary raises LookupError."""
    data = ItineraryValidationCreate(guide_id=sample_data["g1"].id, result=True)

    with pytest.raises(LookupError, match="Itinerary not found"):
        service.create_validation(99999, data, db_session)


def test_create_validation_guide_not_found(db_session, sample_data):
    """An unknown guide raises LookupError."""
    data = ItineraryValidationCreate(guide_id=99999, result=True)

    with pytest.raises(LookupError, match="Guide not found"):
        service.create_validation(sample_data["it1"].id, data, db_session)


def test_create_validation_by_the_creator(db_session, sample_data):
    """The guide who generated the itinerary cannot validate it."""
    d = sample_data
    data = ItineraryValidationCreate(guide_id=d["g3"].id, result=True)

    with pytest.raises(PermissionError, match="generated"):
        service.create_validation(d["it1"].id, data, db_session)


def test_create_validation_itinerary_without_package(db_session, sample_data):
    """An itinerary without package cannot be validated."""
    d = sample_data
    data = ItineraryValidationCreate(guide_id=d["g1"].id, result=True)

    with pytest.raises(ValueError, match="package"):
        service.create_validation(d["it4"].id, data, db_session)


def test_create_validation_approved(db_session, sample_data):
    """An approved validation is stored and marks the itinerary as validated."""
    d = sample_data
    authorize(db_session, d["g2"], d["pkg1"])
    data = ItineraryValidationCreate(
        guide_id=d["g2"].id, result=True, observations="Looks good"
    )

    validation = service.create_validation(d["it2"].id, data, db_session)

    assert validation.itinerary_id == d["it2"].id
    assert validation.guide_id == d["g2"].id
    assert validation.result is True
    assert validation.observations == "Looks good"
    assert validation.validation_date is not None
    db_session.refresh(d["it2"])
    assert d["it2"].status == ItineraryStatus.VALIDATED


def test_create_validation_rejected(db_session, sample_data):
    """A rejected validation marks the itinerary as rejected."""
    d = sample_data
    authorize(db_session, d["g2"], d["pkg1"])
    d["it2"].status = ItineraryStatus.VALIDATED
    db_session.commit()
    data = ItineraryValidationCreate(guide_id=d["g2"].id, result=False)

    validation = service.create_validation(d["it2"].id, data, db_session)

    assert validation.result is False
    db_session.refresh(d["it2"])
    assert d["it2"].status == ItineraryStatus.REJECTED


def test_create_validation_without_authorization(db_session, sample_data):
    """A guide without authorization on the package cannot validate."""
    d = sample_data
    data = ItineraryValidationCreate(guide_id=d["g2"].id, result=True)

    with pytest.raises(PermissionError, match="cannot validate"):
        service.create_validation(d["it2"].id, data, db_session)


def test_create_validation_without_can_validate(db_session, sample_data):
    """An authorization with can_validate=False is not enough."""
    d = sample_data
    authorize(db_session, d["g2"], d["pkg1"], can_validate=False)
    data = ItineraryValidationCreate(guide_id=d["g2"].id, result=True)

    with pytest.raises(PermissionError, match="cannot validate"):
        service.create_validation(d["it2"].id, data, db_session)
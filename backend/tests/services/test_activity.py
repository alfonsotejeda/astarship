"""Tests for the activity service."""

import pytest

from app.models.status import ReviewStatus
from app.schemas.activity import ActivityCreate, ActivityUpdate
from app.schemas.activity_type import ActivityTypeCreate
from app.schemas.attraction import AttractionCreate
from app.schemas.category import CategoryCreate
from app.schemas.user import GuideCreate
from app.services import activity as activity_service
from app.services import activity_type as activity_type_service
from app.services import attraction as attraction_service
from app.services import category as category_service
from app.services import user as user_service


@pytest.fixture
def refs(db_session):
    """Ids of the category, activity type, guide and attraction every activity needs."""
    category = category_service.create_category(db_session, CategoryCreate(name="Adventure"))
    activity_type = activity_type_service.create_activity_type(
        db_session, ActivityTypeCreate(code="HIKE", name="Hiking")
    )
    guide = user_service.create_user(
        db_session,
        GuideCreate(
            name="Gil", role="guide", email="gil@example.com", password="x", specialty="History"
        ),
    )
    attraction = attraction_service.create_attraction(
        db_session,
        AttractionCreate(
            name="Malecón", address="Av. del Puerto", latitude=23.14, longitude=-82.36
        ),
    )
    return {
        "category_id": category.id,
        "activity_type_code": activity_type.code,
        "guide_id": guide.id,
        "attraction_id": attraction.id,
    }


def _create(db_session, refs, name="Hiking", **overrides):
    data = ActivityCreate(**{"name": name, "effort_level": 3, "duration": 90, **refs, **overrides})
    return activity_service.create_activity(db_session, data)


def test_create_activity_persists_it(db_session, refs):
    activity = _create(db_session, refs)

    assert activity.id is not None
    assert activity.name == "Hiking"
    assert activity.duration == 90
    assert activity.status is ReviewStatus.PENDING
    assert activity.creation_date is not None
    assert activity.category_id == refs["category_id"]
    assert activity.activity_type_code == refs["activity_type_code"]
    assert activity.guide_id == refs["guide_id"]
    assert activity.attraction_id == refs["attraction_id"]


@pytest.mark.parametrize(
    "field, value, message",
    [
        ("category_id", 999, "Category"),
        ("guide_id", 999, "Guide"),
        ("activity_type_code", "MISSING", "Activity Type"),
        ("attraction_id", 999, "Attraction"),
    ],
)
def test_create_activity_with_unknown_reference_raises(db_session, refs, field, value, message):
    with pytest.raises(LookupError, match=message):
        _create(db_session, refs, **{field: value})

    assert activity_service.list_activities(db_session) == []


def test_create_activity_rejects_repeated_name_in_the_same_attraction(db_session, refs):
    _create(db_session, refs, name="Tour")

    with pytest.raises(ValueError, match="already exists"):
        _create(db_session, refs, name="Tour")

    assert len(activity_service.list_activities(db_session)) == 1


def test_create_activity_allows_same_name_in_another_attraction(db_session, refs):
    other = attraction_service.create_attraction(
        db_session,
        AttractionCreate(name="Capitolio", address="Paseo", latitude=23.13, longitude=-82.36),
    )
    _create(db_session, refs, name="Tour")

    second = _create(db_session, refs, name="Tour", attraction_id=other.id)

    assert second.attraction_id == other.id


def test_get_activity_returns_none_when_missing(db_session):
    assert activity_service.get_activity(db_session, 999) is None


def test_update_activity_applies_partial_changes(db_session, refs):
    activity = _create(db_session, refs, name="Old", effort_level=1, duration=60)

    updated = activity_service.update_activity(db_session, activity, ActivityUpdate(name="New"))

    assert updated.name == "New"
    assert updated.effort_level == 1
    assert updated.duration == 60
    assert updated.category_id == refs["category_id"]


def test_update_activity_changes_duration(db_session, refs):
    activity = _create(db_session, refs, name="Tour", effort_level=1, duration=60)

    updated = activity_service.update_activity(db_session, activity, ActivityUpdate(duration=120))

    assert updated.duration == 120


def test_update_activity_can_move_it_to_another_category(db_session, refs):
    activity = _create(db_session, refs)
    other = category_service.create_category(db_session, CategoryCreate(name="Culture"))

    updated = activity_service.update_activity(
        db_session, activity, ActivityUpdate(category_id=other.id)
    )

    assert updated.category_id == other.id


def test_update_activity_with_unknown_category_raises(db_session, refs):
    activity = _create(db_session, refs)

    with pytest.raises(LookupError, match="Category"):
        activity_service.update_activity(db_session, activity, ActivityUpdate(category_id=999))

    assert activity.category_id == refs["category_id"]


def test_update_activity_can_move_it_to_another_attraction(db_session, refs):
    activity = _create(db_session, refs)
    other = attraction_service.create_attraction(
        db_session,
        AttractionCreate(name="Capitolio", address="Paseo", latitude=23.13, longitude=-82.36),
    )

    updated = activity_service.update_activity(
        db_session, activity, ActivityUpdate(attraction_id=other.id)
    )

    assert updated.attraction_id == other.id


def test_update_activity_with_unknown_attraction_raises(db_session, refs):
    activity = _create(db_session, refs)

    with pytest.raises(LookupError, match="Attraction"):
        activity_service.update_activity(db_session, activity, ActivityUpdate(attraction_id=999))

    assert activity.attraction_id == refs["attraction_id"]


def test_update_activity_rejects_name_taken_in_its_attraction(db_session, refs):
    _create(db_session, refs, name="Taken")
    activity = _create(db_session, refs, name="Free")

    with pytest.raises(ValueError, match="already exists"):
        activity_service.update_activity(db_session, activity, ActivityUpdate(name="Taken"))


def test_update_activity_keeping_its_own_name_is_allowed(db_session, refs):
    activity = _create(db_session, refs, name="Same")

    updated = activity_service.update_activity(
        db_session, activity, ActivityUpdate(name="Same", effort_level=5)
    )

    assert updated.effort_level == 5


def test_delete_activity_removes_it(db_session, refs):
    activity = _create(db_session, refs, name="Temp", effort_level=1, duration=60)

    activity_service.delete_activity(db_session, activity)

    assert activity_service.get_activity(db_session, activity.id) is None


def test_list_activities_filters_by_status(db_session, refs):
    approved = _create(db_session, refs, name="A")
    _create(db_session, refs, name="B")
    approved.status = ReviewStatus.APPROVED
    db_session.commit()

    result = activity_service.list_activities(db_session, ReviewStatus.APPROVED)

    assert [a.id for a in result] == [approved.id]


def test_activities_by_type_returns_only_that_type_ordered_by_name(db_session, refs):
    _create(db_session, refs, name="Beta")
    _create(db_session, refs, name="Alpha")
    activity_type_service.create_activity_type(
        db_session, ActivityTypeCreate(code="MUSEUM", name="Museum")
    )
    _create(db_session, refs, name="Louvre", activity_type_code="MUSEUM")

    result = activity_service.activities_by_type(db_session, "HIKE")

    assert [a.name for a in result] == ["Alpha", "Beta"]


def test_activities_by_type_raises_when_type_is_missing(db_session):
    with pytest.raises(LookupError, match="Activity Type"):
        activity_service.activities_by_type(db_session, "MISSING")
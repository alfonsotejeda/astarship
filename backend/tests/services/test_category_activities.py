"""Tests for the activity queries of the category service."""

import pytest

from app.schemas.activity import ActivityCreate
from app.schemas.activity_type import ActivityTypeCreate
from app.schemas.category import CategoryCreate
from app.schemas.user import GuideCreate
from app.services import activity as activity_service
from app.services import activity_type as activity_type_service
from app.services import category as category_service
from app.services import user as user_service


@pytest.fixture
def refs(db_session):
    """The activity type and guide every activity needs."""
    activity_type = activity_type_service.create_activity_type(
        db_session, ActivityTypeCreate(code="HIKE", name="Hiking")
    )
    guide = user_service.create_user(
        db_session,
        GuideCreate(
            name="Gil", role="guide", email="gil@example.com", password="x", specialty="History"
        ),
    )
    return {"activity_type_code": activity_type.code, "guide_id": guide.id}


def _add_activity(db_session, refs, category, name):
    return activity_service.create_activity(
        db_session,
        ActivityCreate(name=name, effort_level=3, category_id=category.id, **refs),
    )


def test_activities_by_category_returns_only_its_activities_ordered_by_name(db_session, refs):
    adventure = category_service.create_category(db_session, CategoryCreate(name="Adventure"))
    culture = category_service.create_category(db_session, CategoryCreate(name="Culture"))
    _add_activity(db_session, refs, adventure, "Beta")
    _add_activity(db_session, refs, adventure, "Alpha")
    _add_activity(db_session, refs, culture, "Museum")

    result = category_service.activities_by_category(db_session, adventure.id)

    assert [a.name for a in result] == ["Alpha", "Beta"]


def test_activities_by_category_returns_empty_list_when_it_has_none(db_session):
    category = category_service.create_category(db_session, CategoryCreate(name="Empty"))

    assert category_service.activities_by_category(db_session, category.id) == []


def test_activities_by_category_raises_when_category_is_missing(db_session):
    with pytest.raises(LookupError, match="Category"):
        category_service.activities_by_category(db_session, 999)


def test_activities_count_by_categories_includes_categories_without_activities(db_session, refs):
    adventure = category_service.create_category(db_session, CategoryCreate(name="Adventure"))
    category_service.create_category(db_session, CategoryCreate(name="Culture"))
    _add_activity(db_session, refs, adventure, "Alpha")
    _add_activity(db_session, refs, adventure, "Beta")

    result = category_service.activities_count_by_categories(db_session)

    assert [(category.name, total) for category, total in result] == [
        ("Adventure", 2),
        ("Culture", 0),
    ]


def test_activities_count_by_categories_returns_empty_list_without_categories(db_session):
    assert category_service.activities_count_by_categories(db_session) == []


def test_delete_category_with_activities_raises(db_session, refs):
    category = category_service.create_category(db_session, CategoryCreate(name="Adventure"))
    _add_activity(db_session, refs, category, "Alpha")

    with pytest.raises(ValueError, match="existing activities"):
        category_service.delete_category(db_session, category)

    assert category_service.category_by_id(db_session, category.id) is not None

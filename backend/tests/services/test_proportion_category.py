"""Tests for the proportion category service."""

from datetime import date

from app.schemas.category import CategoryCreate
from app.schemas.itinerary import ItineraryCreate
from app.schemas.proportion_category import ProportionCategoryCreate, ProportionCategoryUpdate
from app.services import category as category_service
from app.services import itinerary as itinerary_service
from app.services import proportion_category as proportion_category_service


def _create_itinerary(db_session):
    return itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(creation_date=date(2026, 1, 1), activity_count=4),
    )


def _create_category(db_session, name="Culture"):
    return category_service.create_category(db_session, CategoryCreate(name=name))


def test_create_proportion_category_stores_the_value(db_session):
    itinerary = _create_itinerary(db_session)
    category = _create_category(db_session)

    proportion_category = proportion_category_service.create_proportion_category(
        db_session, itinerary.id, category.id, ProportionCategoryCreate(value=40)
    )

    assert proportion_category.itinerary_id == itinerary.id
    assert proportion_category.category_id == category.id
    assert proportion_category.value == 40


def test_update_proportion_category_replaces_the_value(db_session):
    itinerary = _create_itinerary(db_session)
    category = _create_category(db_session)
    proportion_category = proportion_category_service.create_proportion_category(
        db_session, itinerary.id, category.id, ProportionCategoryCreate(value=40)
    )

    proportion_category_service.update_proportion_category(
        db_session, proportion_category, ProportionCategoryUpdate(value=60)
    )

    proportion_category = proportion_category_service.get_proportion_category(
        db_session, itinerary.id, category.id
    )
    assert proportion_category.value == 60
    proportion_categories = proportion_category_service.list_proportion_categories(
        db_session, itinerary.id
    )
    assert len(proportion_categories) == 1


def test_list_proportion_categories_only_returns_the_itinerary_ones(db_session):
    itinerary = _create_itinerary(db_session)
    other = _create_itinerary(db_session)
    culture = _create_category(db_session, "Culture")
    nature = _create_category(db_session, "Nature")
    proportion_category_service.create_proportion_category(
        db_session, itinerary.id, culture.id, ProportionCategoryCreate(value=50)
    )
    proportion_category_service.create_proportion_category(
        db_session, itinerary.id, nature.id, ProportionCategoryCreate(value=50)
    )
    proportion_category_service.create_proportion_category(
        db_session, other.id, culture.id, ProportionCategoryCreate(value=100)
    )

    proportion_categories = proportion_category_service.list_proportion_categories(
        db_session, itinerary.id
    )

    assert {p.category_id for p in proportion_categories} == {culture.id, nature.id}


def test_get_proportion_category_returns_none_when_missing(db_session):
    assert proportion_category_service.get_proportion_category(db_session, 999, 999) is None


def test_delete_proportion_category_removes_it(db_session):
    itinerary = _create_itinerary(db_session)
    category = _create_category(db_session)
    proportion_category = proportion_category_service.create_proportion_category(
        db_session, itinerary.id, category.id, ProportionCategoryCreate(value=40)
    )

    proportion_category_service.delete_proportion_category(db_session, proportion_category)

    assert (
        proportion_category_service.get_proportion_category(db_session, itinerary.id, category.id)
        is None
    )


def test_deleting_the_itinerary_removes_its_proportion_categories(db_session):
    itinerary = _create_itinerary(db_session)
    category = _create_category(db_session)
    proportion_category_service.create_proportion_category(
        db_session, itinerary.id, category.id, ProportionCategoryCreate(value=40)
    )

    itinerary_service.delete_itinerary(db_session, itinerary)

    assert (
        proportion_category_service.get_proportion_category(db_session, itinerary.id, category.id)
        is None
    )


def test_deleting_the_category_removes_its_proportion_categories(db_session):
    itinerary = _create_itinerary(db_session)
    category = _create_category(db_session)
    proportion_category_service.create_proportion_category(
        db_session, itinerary.id, category.id, ProportionCategoryCreate(value=40)
    )

    category_service.delete_category(db_session, category)

    assert proportion_category_service.list_proportion_categories(db_session, itinerary.id) == []

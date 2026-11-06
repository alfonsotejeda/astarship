"""Tests for the report service."""

from datetime import date

import pytest

from app.models.status import ItineraryStatus
from app.schemas.activity_type import ActivityTypeCreate
from app.schemas.category import CategoryCreate
from app.schemas.itinerary import ItineraryCreate, ItineraryUpdate
from app.schemas.package import PackageCreate
from app.schemas.proportion_category import ProportionCategoryCreate
from app.schemas.proportion_type import ProportionTypeCreate
from app.schemas.report import Rc1SortColumn, SortOrder
from app.schemas.user import GuideCreate
from app.services import activity_type as activity_type_service
from app.services import category as category_service
from app.services import itinerary as itinerary_service
from app.services import package as package_service
from app.services import proportion_category as proportion_category_service
from app.services import proportion_type as proportion_type_service
from app.services import report as report_service
from app.services import user as user_service


@pytest.fixture
def rc1_data(db_session, itinerary_owners):
    """Two packages and two guides with three itineraries; the first one has parameters."""
    andes_id, gil_id = itinerary_owners["package_id"], itinerary_owners["guide_id"]
    admin_id = package_service.get_package(db_session, andes_id).admin_id
    alps_id = package_service.create_package(
        db_session, PackageCreate(name="Alps", destination="Swiss", admin_id=admin_id)
    ).id
    ana_id = user_service.create_user(
        db_session,
        GuideCreate(
            name="Ana", role="guide", email="ana@example.com", password="x", specialty="Nature"
        ),
    ).id

    def create(package_id, guide_id, creation_date, activity_count, status=None) -> int:
        itinerary = itinerary_service.create_itinerary(
            db_session,
            ItineraryCreate(
                creation_date=creation_date,
                activity_count=activity_count,
                package_id=package_id,
                guide_id=guide_id,
            ),
        )
        if status is not None:
            itinerary_service.update_itinerary(
                db_session, itinerary, ItineraryUpdate(status=status)
            )
        return itinerary.id

    first = create(andes_id, gil_id, date(2026, 1, 10), 4)
    second = create(andes_id, ana_id, date(2026, 2, 10), 6, ItineraryStatus.APPROVED)
    third = create(alps_id, gil_id, date(2026, 3, 10), 5, ItineraryStatus.APPROVED)

    activity_type_service.create_activity_type(
        db_session, ActivityTypeCreate(code="hike", name="Hiking")
    )
    category = category_service.create_category(db_session, CategoryCreate(name="Nature"))
    proportion_type_service.create_proportion_type(
        db_session, first, "hike", ProportionTypeCreate(value=50)
    )
    proportion_category_service.create_proportion_category(
        db_session, first, category.id, ProportionCategoryCreate(value=25)
    )
    return {
        "andes_id": andes_id,
        "alps_id": alps_id,
        "gil_id": gil_id,
        "ana_id": ana_id,
        "category_id": category.id,
        "itineraries": [first, second, third],
    }


def test_rc1_returns_creator_date_and_parameters(db_session, rc1_data):
    report = report_service.rc1_generated_itineraries(db_session)

    first = next(row for row in report.rows if row.id == rc1_data["itineraries"][0])
    assert first.creator == "Gil"
    assert first.package_name == "Andes"
    assert first.creation_date == date(2026, 1, 10)
    assert first.status is ItineraryStatus.PENDING
    assert first.activity_count == 4
    assert [
        (p.activity_type_code, p.activity_type_name, p.value) for p in first.proportion_types
    ] == [("hike", "Hiking", 50)]
    assert [(p.category_id, p.category_name, p.value) for p in first.proportion_categories] == [
        (rc1_data["category_id"], "Nature", 25)
    ]


def test_rc1_returns_no_parameters_when_none_were_used(db_session, rc1_data):
    report = report_service.rc1_generated_itineraries(db_session)

    second = next(row for row in report.rows if row.id == rc1_data["itineraries"][1])
    assert second.proportion_types == []
    assert second.proportion_categories == []


def test_rc1_sorts_by_creation_date_descending_by_default(db_session, rc1_data):
    report = report_service.rc1_generated_itineraries(db_session)

    assert [row.id for row in report.rows] == rc1_data["itineraries"][::-1]


def test_rc1_sorts_by_the_requested_column(db_session, rc1_data):
    report = report_service.rc1_generated_itineraries(
        db_session, sort=Rc1SortColumn.CREATOR, order=SortOrder.ASC
    )

    assert [row.creator for row in report.rows] == ["Ana", "Gil", "Gil"]


def test_rc1_filters_by_package(db_session, rc1_data):
    report = report_service.rc1_generated_itineraries(db_session, package_id=rc1_data["alps_id"])

    assert [row.id for row in report.rows] == [rc1_data["itineraries"][2]]


def test_rc1_filters_by_date_range(db_session, rc1_data):
    report = report_service.rc1_generated_itineraries(
        db_session, date_from=date(2026, 2, 1), date_to=date(2026, 2, 28)
    )

    assert [row.id for row in report.rows] == [rc1_data["itineraries"][1]]


def test_rc1_chart_counts_itineraries_by_creator_and_status(db_session, rc1_data):
    report = report_service.rc1_generated_itineraries(db_session)

    assert [(p.creator, p.status, p.count) for p in report.chart] == [
        ("Ana", ItineraryStatus.APPROVED, 1),
        ("Gil", ItineraryStatus.APPROVED, 1),
        ("Gil", ItineraryStatus.PENDING, 1),
    ]


def test_rc1_chart_uses_the_same_filters(db_session, rc1_data):
    report = report_service.rc1_generated_itineraries(db_session, package_id=rc1_data["andes_id"])

    assert [(p.guide_id, p.status, p.count) for p in report.chart] == [
        (rc1_data["ana_id"], ItineraryStatus.APPROVED, 1),
        (rc1_data["gil_id"], ItineraryStatus.PENDING, 1),
    ]


def test_rc1_is_empty_without_itineraries(db_session):
    report = report_service.rc1_generated_itineraries(db_session)

    assert report.rows == []
    assert report.chart == []

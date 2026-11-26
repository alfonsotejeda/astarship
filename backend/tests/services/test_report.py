"""Tests for the report service."""

from datetime import date

import pytest

from app.models.status import ItineraryStatus
from app.schemas.activity_type import ActivityTypeCreate
from app.schemas.category import CategoryCreate
from app.schemas.itinerary import ItineraryCreate
from app.schemas.package import PackageCreate
from app.schemas.proportion_category import ProportionCategoryCreate
from app.schemas.proportion_type import ProportionTypeCreate
from app.schemas.report import EffortLevel, Rc1SortColumn, Rc2SortColumn, SortOrder
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
            itinerary.status = status
            db_session.commit()
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


def test_rc2_counts_uses_of_approved_itineraries_only(db_session, rc2_data):
    report = report_service.rc2_most_used_activities(db_session)

    assert [(row.activity_name, row.effort, row.uses, row.percentage) for row in report.rows] == [
        ("Peak", EffortLevel.HIGH, 3, pytest.approx(3 / 7 * 100)),
        ("Forest", EffortLevel.MEDIUM, 2, pytest.approx(2 / 7 * 100)),
        ("River", EffortLevel.LOW, 2, pytest.approx(2 / 7 * 100)),
    ]


def test_rc2_returns_activity_details(db_session, rc2_data):
    report = report_service.rc2_most_used_activities(db_session)

    peak = next(row for row in report.rows if row.activity_id == rc2_data["peak_id"])
    river = next(row for row in report.rows if row.activity_id == rc2_data["river_id"])
    assert (peak.activity_name, peak.activity_type_code, peak.activity_type_name) == (
        "Peak",
        "hike",
        "Hike",
    )
    assert peak.category_id == rc2_data["hiking_category_id"]
    assert peak.category_name == "Hiking routes"
    assert (river.activity_type_code, river.activity_type_name, river.category_name) == (
        "boat",
        "Boat",
        "Water",
    )


def test_rc2_sorts_by_uses_descending_by_default(db_session, rc2_data):
    report = report_service.rc2_most_used_activities(db_session)

    assert [row.activity_name for row in report.rows] == ["Peak", "Forest", "River"]


@pytest.mark.parametrize(
    ("sort", "order", "expected"),
    [
        (Rc2SortColumn.ACTIVITY_NAME, SortOrder.ASC, ["Forest", "Peak", "River"]),
        (Rc2SortColumn.CATEGORY, SortOrder.ASC, ["Peak", "Forest", "River"]),
        (Rc2SortColumn.ACTIVITY_TYPE, SortOrder.ASC, ["River", "Peak", "Forest"]),
        (Rc2SortColumn.EFFORT, SortOrder.ASC, ["River", "Forest", "Peak"]),
        (Rc2SortColumn.USES, SortOrder.ASC, ["Forest", "River", "Peak"]),
        (Rc2SortColumn.PERCENTAGE, SortOrder.DESC, ["Peak", "Forest", "River"]),
    ],
)
def test_rc2_sorts_by_the_requested_column(db_session, rc2_data, sort, order, expected):
    report = report_service.rc2_most_used_activities(db_session, sort=sort, order=order)

    assert [row.activity_name for row in report.rows] == expected


def test_rc2_filters_by_package(db_session, rc2_data):
    report = report_service.rc2_most_used_activities(db_session, package_id=rc2_data["andes_id"])

    assert [(row.activity_name, row.uses) for row in report.rows] == [
        ("Peak", 3),
        ("Forest", 2),
        ("River", 1),
    ]
    assert report.summary.final_itineraries == 3
    assert report.summary.total_uses == 6


def test_rc2_filters_by_date_range(db_session, rc2_data):
    report = report_service.rc2_most_used_activities(
        db_session, date_from=date(2026, 2, 1), date_to=date(2026, 2, 28)
    )

    assert [(row.activity_name, row.uses) for row in report.rows] == [
        ("Peak", 1),
        ("River", 1),
    ]
    assert report.summary.final_itineraries == 1


def test_rc2_chart_stacks_uses_by_category_and_effort(db_session, rc2_data):
    report = report_service.rc2_most_used_activities(db_session)

    assert [(point.category, point.low, point.medium, point.high) for point in report.chart] == [
        ("Hiking routes", 0, 2, 3),
        ("Water", 2, 0, 0),
    ]


def test_rc2_chart_uses_the_same_filters(db_session, rc2_data):
    report = report_service.rc2_most_used_activities(db_session, package_id=rc2_data["alps_id"])

    assert [(point.category, point.low, point.medium, point.high) for point in report.chart] == [
        ("Water", 1, 0, 0)
    ]


def test_rc2_summarizes_final_itineraries_and_high_effort(db_session, rc2_data):
    report = report_service.rc2_most_used_activities(db_session)

    assert report.summary.model_dump() == {
        "final_itineraries": 4,
        "distinct_activities": 3,
        "total_uses": 7,
        "high_effort_uses": 3,
    }


def test_rc2_is_empty_without_final_itineraries(db_session):
    report = report_service.rc2_most_used_activities(db_session)

    assert report.rows == []
    assert report.chart == []
    assert report.summary.model_dump() == {
        "final_itineraries": 0,
        "distinct_activities": 0,
        "total_uses": 0,
        "high_effort_uses": 0,
    }

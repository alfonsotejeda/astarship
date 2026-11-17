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
from app.schemas.report import EffortLevel, Rc1SortColumn, Rc4SortColumn, SortOrder
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


def test_rc4_groups_visits_by_activity_with_experience_rates(db_session, rc4_data):
    report = report_service.rc4_tourist_experience(db_session)

    assert [(row.id, row.effort, row.visits) for row in report.rows] == [
        (rc4_data["activities"]["Canyon"], EffortLevel.BAJO, 3),
        (rc4_data["activities"]["Museum"], EffortLevel.MEDIO, 3),
        (rc4_data["activities"]["Peak"], EffortLevel.ALTO, 2),
    ]
    canyon, museum, peak = report.rows
    assert (canyon.completed, canyon.rating, canyon.satisfaction, canyon.abandonment) == (
        3,
        pytest.approx(14 / 3),
        pytest.approx(100),
        0,
    )
    assert (museum.completed, museum.rating, museum.satisfaction, museum.abandonment) == (
        1,
        3,
        0,
        pytest.approx(200 / 3),
    )
    assert (peak.completed, peak.rating, peak.satisfaction, peak.abandonment) == (
        1,
        2,
        0,
        50,
    )


def test_rc4_chart_has_one_point_per_effort_band(db_session, rc4_data):
    report = report_service.rc4_tourist_experience(db_session)

    assert [(point.effort, point.label) for point in report.chart] == [
        (EffortLevel.BAJO, "Bajo"),
        (EffortLevel.MEDIO, "Medio"),
        (EffortLevel.ALTO, "Alto"),
    ]
    assert (report.chart[0].satisfaction, report.chart[0].abandonment) == (
        pytest.approx(100),
        0,
    )
    assert (report.chart[1].satisfaction, report.chart[1].abandonment) == (
        0,
        pytest.approx(200 / 3),
    )
    assert (report.chart[2].satisfaction, report.chart[2].abandonment) == (0, 50)


def test_rc4_summary_totals_the_whole_report(db_session, rc4_data):
    summary = report_service.rc4_tourist_experience(db_session).summary

    assert (summary.visits, summary.completed, summary.skipped, summary.rated) == (8, 5, 3, 5)
    assert summary.tourists == 3
    assert summary.rating == pytest.approx(19 / 5)
    assert summary.satisfaction == pytest.approx(3 / 8 * 100)
    assert summary.abandonment == pytest.approx(3 / 8 * 100)


def test_rc4_returns_filter_options(db_session, rc4_data):
    report = report_service.rc4_tourist_experience(db_session)

    assert [(item.id, item.package_name) for item in report.itineraries] == [
        (rc4_data["itineraries"][1], "Andes"),
        (rc4_data["itineraries"][0], "Andes"),
    ]
    assert [(item.id, item.name) for item in report.groups] == [
        (rc4_data["groups"]["alpha"], "Alpha"),
        (rc4_data["groups"]["beta"], "Beta"),
    ]


def test_rc4_filters_by_itinerary(db_session, rc4_data):
    report = report_service.rc4_tourist_experience(
        db_session, itinerary_id=rc4_data["itineraries"][0]
    )

    assert [row.visits for row in report.rows] == [2, 2, 2]
    assert report.summary.visits == 6
    assert report.summary.tourists == 2


def test_rc4_filters_by_group(db_session, rc4_data):
    report = report_service.rc4_tourist_experience(db_session, group_id=rc4_data["groups"]["beta"])

    assert [(row.id, row.visits) for row in report.rows] == [
        (rc4_data["activities"]["Canyon"], 1),
        (rc4_data["activities"]["Museum"], 1),
    ]
    assert report.summary.tourists == 1


def test_rc4_combines_both_filters(db_session, rc4_data):
    report = report_service.rc4_tourist_experience(
        db_session,
        itinerary_id=rc4_data["itineraries"][0],
        group_id=rc4_data["groups"]["beta"],
    )

    assert report.rows == []
    assert report.summary.visits == 0
    assert report.summary.tourists == 0


@pytest.mark.parametrize(
    ("sort", "order", "expected"),
    [
        (Rc4SortColumn.ACTIVITY_ID, SortOrder.DESC, ["Peak", "Museum", "Canyon"]),
        (Rc4SortColumn.ACTIVITY_NAME, SortOrder.DESC, ["Peak", "Museum", "Canyon"]),
        (Rc4SortColumn.EFFORT, SortOrder.DESC, ["Peak", "Museum", "Canyon"]),
        (Rc4SortColumn.VISITS, SortOrder.ASC, ["Peak", "Canyon", "Museum"]),
        (Rc4SortColumn.COMPLETED, SortOrder.DESC, ["Canyon", "Museum", "Peak"]),
        (Rc4SortColumn.RATING, SortOrder.ASC, ["Peak", "Museum", "Canyon"]),
        (Rc4SortColumn.SATISFACTION, SortOrder.DESC, ["Canyon", "Museum", "Peak"]),
        (Rc4SortColumn.ABANDONMENT, SortOrder.DESC, ["Museum", "Peak", "Canyon"]),
    ],
)
def test_rc4_sorts_by_any_column(db_session, rc4_data, sort, order, expected):
    by_name = {name: activity_id for name, activity_id in rc4_data["activities"].items()}

    report = report_service.rc4_tourist_experience(db_session, sort=sort, order=order)

    assert [row.id for row in report.rows] == [by_name[name] for name in expected]


def test_rc4_is_empty_without_visits(db_session, itinerary_owners):
    report = report_service.rc4_tourist_experience(db_session)

    assert report.rows == []
    assert [point.label for point in report.chart] == ["Bajo", "Medio", "Alto"]
    assert all(point.satisfaction == point.abandonment == 0 for point in report.chart)
    assert (report.summary.visits, report.summary.tourists, report.summary.rating) == (0, 0, None)
    assert report.itineraries == []
    assert report.groups == []

"""Tests for the report service."""

from datetime import date, datetime, time

import pytest

from app.models.assignment import Assignment
from app.models.itinerary_composition import ItineraryComposition
from app.models.membership import Membership
from app.models.modification_request import ModificationRequest
from app.models.status import ItineraryStatus
from app.models.travel_group import TravelGroup
from app.models.visit import Visit
from app.schemas.activity_type import ActivityTypeCreate
from app.schemas.category import CategoryCreate
from app.schemas.itinerary import ItineraryCreate
from app.schemas.package import PackageCreate
from app.schemas.proportion_category import ProportionCategoryCreate
from app.schemas.proportion_type import ProportionTypeCreate
from app.schemas.report import Rc1SortColumn, SortOrder
from app.schemas.user import GuideCreate, TouristCreate
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


@pytest.fixture
def rc6_data(db_session, itinerary_owners, insert_activity):
    """Two packages, four tourists, three groups and visits with mixed outcomes."""
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
    tourists = [
        user_service.create_user(
            db_session,
            TouristCreate(
                name=name,
                role="tourist",
                email=f"{name.lower()}@example.com",
                password="x",
                age=30,
            ),
        )
        for name in ("Ada", "Bob", "Eve", "Dan")
    ]
    ada, bob, eve, dan = tourists

    andes_itinerary = itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(
            creation_date=date(2026, 1, 1), activity_count=3, package_id=andes_id, guide_id=gil_id
        ),
    )
    alps_itinerary = itinerary_service.create_itinerary(
        db_session,
        ItineraryCreate(
            creation_date=date(2026, 1, 2), activity_count=1, package_id=alps_id, guide_id=ana_id
        ),
    )

    activities = []
    for name, effort, guide_id in (
        ("Low", 1, gil_id),
        ("Mid", 2, ana_id),
        ("High", 3, gil_id),
        ("Low Alps", 1, ana_id),
    ):
        activity = insert_activity(name)
        activity.effort_level = effort
        activity.guide_id = guide_id
        activities.append(activity)
    low, mid, high, low_alps = activities
    db_session.commit()

    for order, activity in enumerate((low, mid, high), start=1):
        db_session.add(
            ItineraryComposition(
                itinerary_id=andes_itinerary.id,
                activity_id=activity.id,
                order=order,
                day=1,
                start_time=time(8 + order),
            )
        )
    db_session.add(
        ItineraryComposition(
            itinerary_id=alps_itinerary.id,
            activity_id=low_alps.id,
            order=1,
            day=1,
            start_time=time(9),
        )
    )

    andes_date, alps_date = date(2026, 3, 1), date(2026, 3, 2)
    for tourist in tourists:
        db_session.add(
            Assignment(
                itinerary_id=andes_itinerary.id,
                tourist_id=tourist.id,
                assignment_date=andes_date,
                admin_id=admin_id,
            )
        )
    db_session.add(
        Assignment(
            itinerary_id=alps_itinerary.id,
            tourist_id=ada.id,
            assignment_date=alps_date,
            admin_id=admin_id,
        )
    )

    def visit(tourist_id, itinerary_id, activity_id, visit_date, status, rating=None):
        db_session.add(
            Visit(
                itinerary_id=itinerary_id,
                tourist_id=tourist_id,
                assignment_date=visit_date,
                activity_id=activity_id,
                status=status,
                rating=rating,
            )
        )

    for tourist_id, ratings in (
        (ada.id, (5, 3, None)),
        (bob.id, (4, None, 2)),
        (eve.id, (None, 2, 1)),
        (dan.id, (5, 5, 5)),
    ):
        for activity, rating in zip((low, mid, high), ratings):
            if rating is None:
                visit(tourist_id, andes_itinerary.id, activity.id, andes_date, "skipped")
            else:
                visit(tourist_id, andes_itinerary.id, activity.id, andes_date, "done", rating)
    visit(ada.id, alps_itinerary.id, low_alps.id, alps_date, "done", 1)

    groups = [
        TravelGroup(name="Andes Group", guide_id=gil_id),
        TravelGroup(name="Mixed Group", guide_id=ana_id),
        TravelGroup(name="Only Eve", guide_id=gil_id),
    ]
    db_session.add_all(groups)
    db_session.flush()
    for tourist in (ada, bob, eve):
        db_session.add(Membership(tourist_id=tourist.id, travel_group_id=groups[0].id))
    for tourist in (bob, dan):
        db_session.add(Membership(tourist_id=tourist.id, travel_group_id=groups[1].id))
    db_session.add(Membership(tourist_id=eve.id, travel_group_id=groups[2].id))

    def request(tourist_id, itinerary_id, assignment_date, request_date):
        db_session.add(
            ModificationRequest(
                itinerary_id=itinerary_id,
                tourist_id=tourist_id,
                assignment_date=assignment_date,
                guide_id=gil_id,
                request_date=request_date,
                description="Change the route",
            )
        )

    request(ada.id, andes_itinerary.id, andes_date, datetime(2026, 3, 3, 10))
    request(bob.id, andes_itinerary.id, andes_date, datetime(2026, 3, 4, 10))
    request(ada.id, alps_itinerary.id, alps_date, datetime(2026, 3, 5, 10))
    db_session.commit()
    return {
        "andes_id": andes_id,
        "alps_id": alps_id,
        "andes_itinerary_id": andes_itinerary.id,
        "andes_date": andes_date,
        "ada_id": ada.id,
        "bob_id": bob.id,
        "activity_ids": [activity.id for activity in activities],
    }


def test_rc6_scatter_correlates_effort_with_mean_rating(db_session, rc6_data):
    report = report_service.rc6_effort_and_rating(db_session)

    assert [
        (point.package_name, point.effort.value, point.effort_value, point.visits, point.rated)
        for point in report.scatter
    ] == [
        ("Alps", "bajo", 1, 1, 1),
        ("Andes", "bajo", 1, 4, 3),
        ("Andes", "medio", 2, 4, 3),
        ("Andes", "alto", 3, 4, 3),
    ]
    assert [round(point.rating, 2) for point in report.scatter] == [1.0, 4.67, 3.33, 2.67]
    assert report.trend is not None
    assert report.trend.slope < 0
    assert report.trend.correlation is not None and -1 <= report.trend.correlation <= 1
    assert report.trend.from_[0] == 1 and report.trend.to[0] == 3

    andes = report_service.rc6_effort_and_rating(db_session, package_id=rc6_data["andes_id"])
    assert andes.trend is not None and andes.trend.correlation < -0.9


def test_rc6_package_chart_and_effort_summary(db_session, rc6_data):
    report = report_service.rc6_effort_and_rating(db_session)

    chart = [
        (point.package_name, point.bajo, point.medio, point.alto) for point in report.package_chart
    ]
    assert chart == [
        ("Alps", 1.0, None, None),
        ("Andes", 14 / 3, 10 / 3, 8 / 3),
    ]
    summary = [
        (item.label, item.visits, item.rated, item.abandonment) for item in report.effort_summary
    ]
    assert summary == [
        ("Bajo", 5, 4, 20.0),
        ("Medio", 4, 3, 25.0),
        ("Alto", 4, 3, 25.0),
    ]
    assert round(report.effort_summary[0].rating, 2) == 3.75


def test_rc6_ranks_abandonment_with_its_creator_and_package(db_session, rc6_data):
    report = report_service.rc6_effort_and_rating(db_session)

    assert [
        (row.activity_name, row.guide_name, row.package_name, row.visits, row.skipped)
        for row in report.abandonment
    ] == [
        ("High", "Gil", "Andes", 4, 1),
        ("Low", "Gil", "Andes", 4, 1),
        ("Mid", "Ana", "Andes", 4, 1),
        ("Low Alps", "Ana", "Alps", 1, 0),
    ]
    assert [row.abandonment for row in report.abandonment] == [25.0, 25.0, 25.0, 0.0]
    assert report.abandonment[0].activity_id == rc6_data["activity_ids"][2]
    assert report.abandonment[0].id == f"{rc6_data['activity_ids'][2]}-{rc6_data['andes_id']}"


def test_rc6_compares_each_requester_with_each_of_their_groups(db_session, rc6_data):
    report = report_service.rc6_effort_and_rating(db_session)

    rows = {(row.tourist_name, row.group_name, row.package_name): row for row in report.requesters}
    assert set(rows) == {
        ("Ada", "Andes Group", "Alps"),
        ("Ada", "Andes Group", "Andes"),
        ("Bob", "Andes Group", "Andes"),
        ("Bob", "Mixed Group", "Andes"),
    }
    ada = rows[("Ada", "Andes Group", "Andes")]
    assert (ada.requests, ada.visits, ada.rated, ada.rating) == (1, 3, 2, 4.0)
    assert (ada.group_rating, ada.difference) == (2.25, 1.75)
    bob = rows[("Bob", "Andes Group", "Andes")]
    assert round(bob.group_rating, 2) == 2.75 and round(bob.difference, 2) == 0.25
    mixed = rows[("Bob", "Mixed Group", "Andes")]
    assert mixed.group_rating == 5.0 and mixed.difference == -2.0
    # Only Eve belongs to the third group, so there is no other member to compare with
    alps = rows[("Ada", "Andes Group", "Alps")]
    assert alps.rating == 1.0 and alps.group_rating is None and alps.difference is None


def test_rc6_summary_counts_visits_requests_and_tourists(db_session, rc6_data):
    report = report_service.rc6_effort_and_rating(db_session)

    assert report.summary.packages == 2
    assert report.summary.activities == 4
    assert (report.summary.visits, report.summary.completed, report.summary.skipped) == (13, 10, 3)
    assert (report.summary.rated, report.summary.rating) == (10, 3.3)
    assert report.summary.abandonment == pytest.approx(3 * 100 / 13)
    assert (report.summary.requesters, report.summary.requests) == (2, 3)


def test_rc6_filters_by_package(db_session, rc6_data):
    report = report_service.rc6_effort_and_rating(db_session, package_id=rc6_data["alps_id"])

    assert [point.package_name for point in report.scatter] == ["Alps"]
    assert [row.activity_name for row in report.abandonment] == ["Low Alps"]
    assert [(row.tourist_name, row.package_name) for row in report.requesters] == [("Ada", "Alps")]
    assert report.summary.visits == 1 and report.summary.requests == 1


def test_rc6_filters_visits_and_requests_by_date(db_session, rc6_data):
    report = report_service.rc6_effort_and_rating(db_session, date_to=date(2026, 3, 3))

    assert report.summary.visits == 13 and report.summary.requests == 1
    assert [(row.tourist_name, row.package_name) for row in report.requesters] == [("Ada", "Andes")]

    late = report_service.rc6_effort_and_rating(db_session, date_from=date(2026, 3, 4))
    assert late.summary.visits == 0
    assert [row.tourist_name for row in late.requesters] == ["Ada", "Bob", "Bob"]
    assert all(row.rating is None and row.group_rating is None for row in late.requesters)


def test_rc6_abandonment_is_limited_to_ten_activities(db_session, rc6_data, insert_activity):
    for index in range(8):
        activity = insert_activity(f"Extra {index}")
        db_session.add(
            ItineraryComposition(
                itinerary_id=rc6_data["andes_itinerary_id"],
                activity_id=activity.id,
                order=10 + index,
                day=2,
                start_time=time(9),
            )
        )
        db_session.add(
            Visit(
                itinerary_id=rc6_data["andes_itinerary_id"],
                tourist_id=rc6_data["ada_id"],
                assignment_date=rc6_data["andes_date"],
                activity_id=activity.id,
                status="skipped",
            )
        )
    db_session.commit()

    rows = report_service.rc6_effort_and_rating(db_session).abandonment

    assert len(rows) == 10
    assert [row.abandonment for row in rows] == [100.0] * 8 + [25.0, 25.0]
    assert {row.activity_name for row in rows[:8]} == {f"Extra {index}" for index in range(8)}
    assert {row.activity_name for row in rows[8:]} == {"High", "Low"}


def test_rc6_is_empty_without_visits_or_requests(db_session):
    report = report_service.rc6_effort_and_rating(db_session)

    assert report.scatter == [] and report.package_chart == [] and report.abandonment == []
    assert report.requesters == [] and report.trend is None
    assert report.summary.visits == 0 and report.summary.rating is None

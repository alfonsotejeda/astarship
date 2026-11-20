"""Tests for the visit service."""

from datetime import date

import pytest

from app.models.assignment import Assignment
from app.schemas.visit import VisitCreated, VisitUpdate
from app.services import visit as visit_service


def _assignment(scenario, tourist="tourist_id"):
    """Primary key (itinerary, tourist, date) of an assignment of the scenario."""
    return scenario["itinerary_id"], scenario[tourist], scenario["assignment_date"]


def _key(scenario, activity=0, tourist="tourist_id"):
    """Primary key (itinerary, tourist, date, activity) of a visit of the scenario."""
    itinerary_id, tourist_id, assignment_date = _assignment(scenario, tourist)
    return itinerary_id, tourist_id, assignment_date, scenario["activity_ids"][activity]


def _create(db_session, scenario, activity=0, tourist="tourist_id", **overrides):
    itinerary_id, tourist_id, assignment_date, activity_id = _key(scenario, activity, tourist)
    data = VisitCreated(
        **{
            "itinerary_id": itinerary_id,
            "tourist_id": tourist_id,
            "assignment_date": assignment_date,
            "activity_id": activity_id,
            "status": "done",
            "rating": 5,
            **overrides,
        }
    )
    return visit_service.create_visit(db_session, data)


def _assign_again(db_session, scenario, assignment_date):
    """Assign the scenario itinerary to its tourist on another date."""
    db_session.add(
        Assignment(
            itinerary_id=scenario["itinerary_id"],
            tourist_id=scenario["tourist_id"],
            assignment_date=assignment_date,
            admin_id=scenario["admin_id"],
        )
    )
    db_session.commit()


# create / get


def test_create_visit_persists_it(db_session, visit_scenario):
    visit = _create(db_session, visit_scenario, comment="Great")

    assert (
        visit.itinerary_id,
        visit.tourist_id,
        visit.assignment_date,
        visit.activity_id,
    ) == _key(visit_scenario)
    assert visit.status == "done"
    assert visit.rating == 5
    assert visit.comment == "Great"


def test_create_visit_requires_an_existing_assignment(db_session, visit_scenario):
    with pytest.raises(LookupError, match="Assignment"):
        _create(db_session, visit_scenario, tourist="stranger_id")


def test_create_visit_requires_the_assignment_date_to_match(db_session, visit_scenario):
    with pytest.raises(LookupError, match="Assignment"):
        _create(db_session, visit_scenario, assignment_date=date(2020, 1, 1))


def test_create_visit_requires_the_activity_to_be_in_the_itinerary(db_session, visit_scenario):
    data = VisitCreated(
        itinerary_id=visit_scenario["itinerary_id"],
        tourist_id=visit_scenario["tourist_id"],
        assignment_date=visit_scenario["assignment_date"],
        activity_id=visit_scenario["outside_activity_id"],
        status="skipped",
    )

    with pytest.raises(LookupError, match="(?i)composition"):
        visit_service.create_visit(db_session, data)


def test_create_visit_twice_raises_value_error(db_session, visit_scenario):
    _create(db_session, visit_scenario)

    with pytest.raises(ValueError, match="already"):
        _create(db_session, visit_scenario)


def test_the_same_activity_can_be_visited_on_two_assignment_dates(db_session, visit_scenario):
    other_date = date(2026, 4, 1)
    _assign_again(db_session, visit_scenario, other_date)

    first = _create(db_session, visit_scenario, rating=5)
    second = _create(db_session, visit_scenario, assignment_date=other_date, rating=3)

    assert (first.assignment_date, second.assignment_date) == (
        visit_scenario["assignment_date"],
        other_date,
    )
    assert visit_service.get_visit(db_session, *_key(visit_scenario)) is first


def test_get_visit_returns_the_visit(db_session, visit_scenario):
    created = _create(db_session, visit_scenario)

    assert visit_service.get_visit(db_session, *_key(visit_scenario)) is created


def test_get_visit_returns_none_when_missing(db_session, visit_scenario):
    assert visit_service.get_visit(db_session, *_key(visit_scenario)) is None


def test_get_visit_returns_none_for_another_date(db_session, visit_scenario):
    _create(db_session, visit_scenario)
    itinerary_id, tourist_id, _, activity_id = _key(visit_scenario)

    assert (
        visit_service.get_visit(db_session, itinerary_id, tourist_id, date(2020, 1, 1), activity_id)
        is None
    )


# visits of an assignment


def test_visit_by_assignment_returns_the_tourist_visits_in_order(db_session, visit_scenario):
    _create(db_session, visit_scenario, activity=1, rating=3)
    _create(db_session, visit_scenario, activity=0)
    _create(db_session, visit_scenario, activity=0, tourist="other_tourist_id")

    visits = visit_service.visit_by_assignment(db_session, *_assignment(visit_scenario))

    assert [v.activity_id for v in visits] == visit_scenario["activity_ids"]
    assert {v.tourist_id for v in visits} == {visit_scenario["tourist_id"]}


def test_visit_by_assignment_only_returns_the_visits_of_that_date(db_session, visit_scenario):
    other_date = date(2026, 4, 1)
    _assign_again(db_session, visit_scenario, other_date)
    _create(db_session, visit_scenario)
    _create(db_session, visit_scenario, assignment_date=other_date, rating=2)

    visits = visit_service.visit_by_assignment(db_session, *_assignment(visit_scenario))

    assert [v.assignment_date for v in visits] == [visit_scenario["assignment_date"]]


def test_visit_by_assignment_raises_when_the_assignment_is_missing(db_session, visit_scenario):
    with pytest.raises(LookupError):
        visit_service.visit_by_assignment(
            db_session, *_assignment(visit_scenario, tourist="stranger_id")
        )


# update


def test_update_visit_applies_partial_changes(db_session, visit_scenario):
    _create(db_session, visit_scenario, comment="Good")

    updated = visit_service.update_visit(
        db_session, *_key(visit_scenario), VisitUpdate(comment="Great")
    )

    assert updated.comment == "Great"
    assert updated.rating == 5
    assert updated.status == "done"


def test_update_visit_only_changes_the_visit_of_that_date(db_session, visit_scenario):
    other_date = date(2026, 4, 1)
    _assign_again(db_session, visit_scenario, other_date)
    _create(db_session, visit_scenario, rating=5)
    other = _create(db_session, visit_scenario, assignment_date=other_date, rating=3)

    visit_service.update_visit(db_session, *_key(visit_scenario), VisitUpdate(rating=1))

    db_session.refresh(other)
    assert other.rating == 3


def test_update_visit_cannot_leave_a_done_visit_without_rating(db_session, visit_scenario):
    _create(db_session, visit_scenario)

    with pytest.raises(ValueError, match="rating"):
        visit_service.update_visit(db_session, *_key(visit_scenario), VisitUpdate(rating=None))

    assert visit_service.get_visit(db_session, *_key(visit_scenario)).rating == 5


def test_update_visit_to_done_requires_a_rating(db_session, visit_scenario):
    _create(db_session, visit_scenario, status="skipped", rating=None)

    with pytest.raises(ValueError, match="rating"):
        visit_service.update_visit(db_session, *_key(visit_scenario), VisitUpdate(status="done"))


def test_update_visit_to_done_with_a_rating_works(db_session, visit_scenario):
    _create(db_session, visit_scenario, status="skipped", rating=None)

    updated = visit_service.update_visit(
        db_session, *_key(visit_scenario), VisitUpdate(status="done", rating=4)
    )

    assert updated.status == "done"
    assert updated.rating == 4


def test_update_visit_can_clear_the_rating_of_a_skipped_visit(db_session, visit_scenario):
    _create(db_session, visit_scenario, status="skipped", rating=3)

    updated = visit_service.update_visit(
        db_session, *_key(visit_scenario), VisitUpdate(rating=None)
    )

    assert updated.rating is None


def test_update_visit_raises_when_missing(db_session, visit_scenario):
    with pytest.raises(LookupError, match="Visit"):
        visit_service.update_visit(db_session, *_key(visit_scenario), VisitUpdate(comment="x"))


# delete


def test_delete_visit_removes_it(db_session, visit_scenario):
    _create(db_session, visit_scenario)

    visit_service.delete_visit(db_session, *_key(visit_scenario))

    assert visit_service.get_visit(db_session, *_key(visit_scenario)) is None


def test_delete_visit_keeps_the_visit_of_another_date(db_session, visit_scenario):
    other_date = date(2026, 4, 1)
    _assign_again(db_session, visit_scenario, other_date)
    _create(db_session, visit_scenario)
    other = _create(db_session, visit_scenario, assignment_date=other_date, rating=3)

    visit_service.delete_visit(db_session, *_key(visit_scenario))

    assert visit_service.get_visit(db_session, *_key(visit_scenario)) is None
    db_session.refresh(other)
    assert other.rating == 3


def test_delete_visit_raises_when_missing(db_session, visit_scenario):
    with pytest.raises(LookupError, match="Visit"):
        visit_service.delete_visit(db_session, *_key(visit_scenario))


# queries by other axes


def test_visit_by_activity_returns_every_tourist_visit(db_session, visit_scenario):
    _create(db_session, visit_scenario)
    _create(db_session, visit_scenario, tourist="other_tourist_id", status="skipped", rating=None)

    visits = visit_service.visit_by_activity(db_session, visit_scenario["activity_ids"][0])

    assert {v.tourist_id for v in visits} == {
        visit_scenario["tourist_id"],
        visit_scenario["other_tourist_id"],
    }


def test_visit_by_activity_filters_by_status(db_session, visit_scenario):
    _create(db_session, visit_scenario)
    _create(db_session, visit_scenario, tourist="other_tourist_id", status="skipped", rating=None)

    visits = visit_service.visit_by_activity(
        db_session, visit_scenario["activity_ids"][0], "skipped"
    )

    assert [v.tourist_id for v in visits] == [visit_scenario["other_tourist_id"]]


def test_visit_by_activity_raises_when_the_activity_is_missing(db_session):
    with pytest.raises(LookupError):
        visit_service.visit_by_activity(db_session, 999)


def test_visit_by_tourist_returns_only_that_tourist_visits(db_session, visit_scenario):
    _create(db_session, visit_scenario, activity=0)
    _create(db_session, visit_scenario, activity=1, status="skipped", rating=None)
    _create(db_session, visit_scenario, activity=0, tourist="other_tourist_id")

    visits = visit_service.visit_by_tourist(db_session, visit_scenario["tourist_id"])

    assert [v.activity_id for v in visits] == visit_scenario["activity_ids"]
    assert {v.tourist_id for v in visits} == {visit_scenario["tourist_id"]}


def test_visit_by_tourist_includes_every_assignment_date(db_session, visit_scenario):
    other_date = date(2026, 4, 1)
    _assign_again(db_session, visit_scenario, other_date)
    _create(db_session, visit_scenario)
    _create(db_session, visit_scenario, assignment_date=other_date, rating=3)

    visits = visit_service.visit_by_tourist(db_session, visit_scenario["tourist_id"])

    assert [v.assignment_date for v in visits] == [visit_scenario["assignment_date"], other_date]


def test_visit_by_tourist_filters_by_status(db_session, visit_scenario):
    _create(db_session, visit_scenario, activity=0)
    _create(db_session, visit_scenario, activity=1, status="skipped", rating=None)

    visits = visit_service.visit_by_tourist(db_session, visit_scenario["tourist_id"], "skipped")

    assert [v.activity_id for v in visits] == [visit_scenario["activity_ids"][1]]


def test_visit_by_tourist_raises_when_the_tourist_is_missing(db_session):
    with pytest.raises(LookupError):
        visit_service.visit_by_tourist(db_session, 999)


def test_visits_by_itinerary_returns_the_visits_of_all_its_tourists(db_session, visit_scenario):
    _create(db_session, visit_scenario)
    _create(db_session, visit_scenario, tourist="other_tourist_id", status="skipped", rating=None)

    visits = visit_service.visits_by_itinerary(db_session, visit_scenario["itinerary_id"])

    assert len(visits) == 2


def test_visits_by_itinerary_filters_by_status(db_session, visit_scenario):
    _create(db_session, visit_scenario)
    _create(db_session, visit_scenario, tourist="other_tourist_id", status="skipped", rating=None)

    visits = visit_service.visits_by_itinerary(db_session, visit_scenario["itinerary_id"], "done")

    assert [v.tourist_id for v in visits] == [visit_scenario["tourist_id"]]


def test_visits_by_itinerary_raises_when_the_itinerary_is_missing(db_session):
    with pytest.raises(LookupError):
        visit_service.visits_by_itinerary(db_session, 999)


# between dates


def test_visit_between_dates_returns_the_visits_inside_the_range(db_session, visit_scenario):
    other_date = date(2026, 4, 1)
    _assign_again(db_session, visit_scenario, other_date)
    _create(db_session, visit_scenario)
    _create(db_session, visit_scenario, assignment_date=other_date, rating=3)

    visits = visit_service.visit_between_dates(db_session, date(2026, 3, 1), date(2026, 3, 31))

    assert [v.assignment_date for v in visits] == [visit_scenario["assignment_date"]]


def test_visit_between_dates_includes_both_limits(db_session, visit_scenario):
    other_date = date(2026, 4, 1)
    _assign_again(db_session, visit_scenario, other_date)
    _create(db_session, visit_scenario)
    _create(db_session, visit_scenario, assignment_date=other_date, rating=3)

    visits = visit_service.visit_between_dates(db_session, date(2026, 3, 1), other_date)

    assert [v.assignment_date for v in visits] == [visit_scenario["assignment_date"], other_date]


def test_visit_between_dates_returns_an_empty_list_outside_the_range(db_session, visit_scenario):
    _create(db_session, visit_scenario)

    assert visit_service.visit_between_dates(db_session, date(2025, 1, 1), date(2025, 12, 31)) == []


def test_visit_between_dates_rejects_an_inverted_range(db_session):
    with pytest.raises(ValueError, match="first date"):
        visit_service.visit_between_dates(db_session, date(2026, 4, 1), date(2026, 3, 1))


# aggregates


def test_assignment_rating_is_the_average_of_the_done_visits(db_session, visit_scenario):
    _create(db_session, visit_scenario, activity=0, rating=5)
    _create(db_session, visit_scenario, activity=1, rating=4)

    rating = visit_service.assignment_rating(db_session, *_assignment(visit_scenario))

    assert rating == 4.5


def test_assignment_rating_ignores_skipped_visits(db_session, visit_scenario):
    _create(db_session, visit_scenario, activity=0, rating=5)
    _create(db_session, visit_scenario, activity=1, status="skipped", rating=None)

    rating = visit_service.assignment_rating(db_session, *_assignment(visit_scenario))

    assert rating == 5.0


def test_assignment_rating_only_counts_the_visits_of_that_date(db_session, visit_scenario):
    other_date = date(2026, 4, 1)
    _assign_again(db_session, visit_scenario, other_date)
    _create(db_session, visit_scenario, rating=5)
    _create(db_session, visit_scenario, assignment_date=other_date, rating=1)

    rating = visit_service.assignment_rating(db_session, *_assignment(visit_scenario))

    assert rating == 5.0


def test_assignment_rating_is_none_without_ratings(db_session, visit_scenario):
    _create(db_session, visit_scenario, status="skipped", rating=None)

    rating = visit_service.assignment_rating(db_session, *_assignment(visit_scenario))

    assert rating is None


def test_assignment_rating_raises_when_the_assignment_is_missing(db_session, visit_scenario):
    with pytest.raises(LookupError):
        visit_service.assignment_rating(
            db_session, *_assignment(visit_scenario, tourist="stranger_id")
        )


def test_activity_satisfaction_returns_the_average_and_the_count(db_session, visit_scenario):
    _create(db_session, visit_scenario, rating=5)
    _create(db_session, visit_scenario, tourist="other_tourist_id", rating=4)

    average, total = visit_service.activity_satisfaction(
        db_session, visit_scenario["activity_ids"][0]
    )

    assert average == 4.5
    assert total == 2


def test_activity_satisfaction_counts_visits_of_every_assignment_date(db_session, visit_scenario):
    other_date = date(2026, 4, 1)
    _assign_again(db_session, visit_scenario, other_date)
    _create(db_session, visit_scenario, rating=5)
    _create(db_session, visit_scenario, assignment_date=other_date, rating=3)

    average, total = visit_service.activity_satisfaction(
        db_session, visit_scenario["activity_ids"][0]
    )

    assert average == 4.0
    assert total == 2


def test_activity_satisfaction_does_not_count_skipped_visits(db_session, visit_scenario):
    _create(db_session, visit_scenario, rating=5)
    _create(db_session, visit_scenario, tourist="other_tourist_id", status="skipped", rating=None)

    average, total = visit_service.activity_satisfaction(
        db_session, visit_scenario["activity_ids"][0]
    )

    assert average == 5.0
    assert total == 1


def test_activity_satisfaction_without_visits(db_session, visit_scenario):
    assert visit_service.activity_satisfaction(db_session, visit_scenario["activity_ids"][0]) == (
        None,
        0,
    )


def test_activity_satisfaction_raises_when_the_activity_is_missing(db_session):
    with pytest.raises(LookupError):
        visit_service.activity_satisfaction(db_session, 999)


def test_activity_visit_stats_has_one_row_per_activity(db_session, visit_scenario):
    _create(db_session, visit_scenario, rating=5)
    _create(db_session, visit_scenario, tourist="other_tourist_id", status="skipped", rating=None)

    stats = {row["activity_id"]: row for row in visit_service.activity_visit_stats(db_session)}

    first = stats[visit_scenario["activity_ids"][0]]
    assert first["total_visits"] == 2
    assert first["skipped"] == 1
    assert first["abandonment_rate"] == 50.0
    assert first["avg_rating"] == 5.0
    assert first["ratings"] == 1

    # Activities without visits are listed too, with empty metrics.
    untouched = stats[visit_scenario["activity_ids"][1]]
    assert untouched["total_visits"] == 0
    assert untouched["skipped"] == 0
    assert untouched["abandonment_rate"] is None
    assert untouched["avg_rating"] is None
    assert untouched["ratings"] == 0
    assert visit_scenario["outside_activity_id"] in stats


def test_assignment_progress_counts_visits_and_lists_the_pending_activities(
    db_session, visit_scenario
):
    _create(db_session, visit_scenario, activity=0)

    progress = visit_service.assignment_progress(db_session, *_assignment(visit_scenario))

    assert progress == {
        "done": 1,
        "skipped": 0,
        "pending_activity_ids": [visit_scenario["activity_ids"][1]],
    }


def test_assignment_progress_when_every_activity_has_a_visit(db_session, visit_scenario):
    _create(db_session, visit_scenario, activity=0)
    _create(db_session, visit_scenario, activity=1, status="skipped", rating=None)

    progress = visit_service.assignment_progress(db_session, *_assignment(visit_scenario))

    assert progress == {"done": 1, "skipped": 1, "pending_activity_ids": []}


def test_assignment_progress_ignores_the_visits_of_another_date(db_session, visit_scenario):
    other_date = date(2026, 4, 1)
    _assign_again(db_session, visit_scenario, other_date)
    _create(db_session, visit_scenario, assignment_date=other_date)

    progress = visit_service.assignment_progress(db_session, *_assignment(visit_scenario))

    assert progress == {
        "done": 0,
        "skipped": 0,
        "pending_activity_ids": visit_scenario["activity_ids"],
    }


def test_assignment_progress_raises_when_the_assignment_is_missing(db_session, visit_scenario):
    with pytest.raises(LookupError):
        visit_service.assignment_progress(
            db_session, *_assignment(visit_scenario, tourist="stranger_id")
        )
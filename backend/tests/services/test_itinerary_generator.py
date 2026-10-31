"""Tests for the itinerary generator service."""

from datetime import time

import pytest

from app.models.activity import Activity
from app.models.status import ItineraryStatus
from app.schemas.itinerary import ItineraryGenerate
from app.services import itinerary_generator as generator_service


def _activity(activity_id, type_code="walk", category_id=1, effort_level=1, duration=60):
    return Activity(
        id=activity_id,
        name=f"Activity {activity_id}",
        effort_level=effort_level,
        duration=duration,
        activity_type_code=type_code,
        category_id=category_id,
    )


def _params(**overrides) -> ItineraryGenerate:
    fields = {"package_id": 1, "days": 1, "activity_count": 2, "candidate_ids": [1]}
    return ItineraryGenerate(**{**fields, **overrides})


def test_type_targets_round_halves_up():
    data = _params(
        activity_count=5,
        proportion_types=[
            {"activity_type_code": "walk", "value": 50},
            {"activity_type_code": "show", "value": 30},
        ],
    )

    assert generator_service.type_targets(data) == {"walk": 3, "show": 2}


def test_category_targets_require_one_activity_for_any_positive_share():
    data = _params(
        activity_count=4,
        proportion_categories=[{"category_id": 1, "value": 10}, {"category_id": 2, "value": 0}],
    )

    assert generator_service.category_targets(data) == {1: 1, 2: 0}


def test_select_activities_covers_a_missing_category_first():
    candidates = [
        _activity(1, category_id=1),
        _activity(2, category_id=1),
        _activity(3, category_id=2),
    ]

    selected = generator_service.select_activities(candidates, 2, {}, {1: 1, 2: 1})

    assert [activity.id for activity in selected] == [1, 3]


def test_select_activities_fills_type_quotas_before_exceeding_them():
    candidates = [_activity(1, "walk"), _activity(2, "walk"), _activity(3, "show")]

    selected = generator_service.select_activities(candidates, 2, {"walk": 1, "show": 1}, {})

    assert [activity.id for activity in selected] == [1, 3]


def test_select_activities_avoids_types_with_zero_share():
    candidates = [_activity(1, "walk"), _activity(2, "show")]

    selected = generator_service.select_activities(candidates, 1, {"walk": 0}, {})

    assert [activity.id for activity in selected] == [2]


def test_select_activities_stops_when_candidates_run_out():
    selected = generator_service.select_activities([_activity(1)], 3, {}, {})

    assert [activity.id for activity in selected] == [1]


def test_schedule_activities_puts_the_hardest_first_and_chains_start_times():
    activities = [
        _activity(1, effort_level=1, duration=60),
        _activity(2, effort_level=5, duration=90),
        _activity(3, effort_level=3, duration=30),
    ]

    planned = generator_service.schedule_activities(activities, 1)

    assert [(p.activity_id, p.order, p.day, p.start_time) for p in planned] == [
        (2, 1, 1, time(9, 0)),
        (3, 2, 1, time(11, 0)),
        (1, 3, 1, time(12, 0)),
    ]


def test_schedule_activities_spreads_effort_over_the_days():
    activities = [_activity(n, effort_level=n) for n in range(1, 5)]

    planned = generator_service.schedule_activities(activities, 2)

    assert [(p.activity_id, p.day) for p in planned] == [(4, 1), (2, 1), (3, 2), (1, 2)]


def test_schedule_activities_rejects_a_day_that_overflows():
    activities = [_activity(1, duration=600), _activity(2, duration=600)]

    with pytest.raises(ValueError):
        generator_service.schedule_activities(activities, 1)


def test_evaluate_criteria_reports_met_and_unmet_criteria():
    selected = [_activity(1, "walk", 1), _activity(2, "walk", 1)]

    criteria = generator_service.evaluate_criteria(
        selected, 3, {"walk": 2, "show": 1}, {1: 1, 2: 1}
    )

    assert [(c.key, c.subject, c.target, c.actual, c.met) for c in criteria] == [
        ("activity_count", None, 3, 2, False),
        ("type_proportion", "walk", 2, 2, True),
        ("type_proportion", "show", 1, 0, False),
        ("category_coverage", "1", 1, 2, True),
        ("category_coverage", "2", 1, 0, False),
    ]


def test_save_itinerary_stores_it_pending_with_parameters_and_activities(
    db_session, itinerary_owners
):
    activity = _activity(None)
    db_session.add(activity)
    db_session.commit()
    data = _params(
        package_id=itinerary_owners["package_id"],
        activity_count=1,
        candidate_ids=[activity.id],
    )
    plan = generator_service.plan_itinerary([activity], data)

    itinerary = generator_service.save_itinerary(
        db_session, data, itinerary_owners["guide_id"], plan
    )

    assert itinerary.status is ItineraryStatus.PENDING
    assert itinerary.activity_count == 1
    assert itinerary.guide_id == itinerary_owners["guide_id"]
    assert [(c.activity_id, c.order, c.day) for c in itinerary.compositions] == [
        (activity.id, 1, 1)
    ]

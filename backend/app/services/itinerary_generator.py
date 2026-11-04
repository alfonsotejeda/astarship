"""Automatic itinerary generator (RF-13 to RF-16)."""

from collections import Counter
from datetime import date, time

from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.itinerary import Itinerary
from app.models.itinerary_composition import ItineraryComposition
from app.models.proportion_category import ProportionCategory
from app.models.proportion_type import ProportionType
from app.schemas.itinerary import BalanceCriterion, ItineraryGenerate, ItineraryPlan
from app.schemas.itinerary_composition import PlannedActivity


def _quota(value: int, activity_count: int) -> int:
    """Return how many of the activities a percentage stands for, rounding halves up."""
    return (value * activity_count + 50) // 100


def type_targets(data: ItineraryGenerate) -> dict[str, int]:
    """Return how many activities each requested activity type should have."""
    return {
        proportion.activity_type_code: _quota(proportion.value, data.activity_count)
        for proportion in data.proportion_types
    }


def category_targets(data: ItineraryGenerate) -> dict[int, int]:
    """Return the minimum activities of each requested category; a positive share covers it."""
    return {
        proportion.category_id: max(
            _quota(proportion.value, data.activity_count), 1 if proportion.value else 0
        )
        for proportion in data.proportion_categories
    }


def select_activities(
    candidates: list[Activity],
    activity_count: int,
    types: dict[str, int],
    categories: dict[int, int],
) -> list[Activity]:
    """Pick, one by one, the candidate that best closes the category and type gaps."""
    remaining = sorted(candidates, key=lambda activity: activity.id)
    selected: list[Activity] = []
    type_counts: Counter[str | None] = Counter()
    category_counts: Counter[int | None] = Counter()

    def priority(activity: Activity) -> tuple[bool, bool, bool]:
        """Rank first a missing category, then a missing type, then a type not yet full."""
        category_gap = category_counts[activity.category_id] < categories.get(
            activity.category_id, 0
        )
        code = activity.activity_type_code
        type_target = types.get(code)
        type_gap = type_target is not None and type_counts[code] < type_target
        return category_gap, type_gap, type_target is None or type_gap

    while remaining and len(selected) < activity_count:
        best = max(remaining, key=priority)
        remaining.remove(best)
        selected.append(best)
        type_counts[best.activity_type_code] += 1
        category_counts[best.category_id] += 1
    return selected


def schedule_activities(
    selected: list[Activity],
    days: int,
    day_start: time = time(9, 0),
    break_minutes: int = 30,
) -> list[PlannedActivity]:
    """Spread the activities over the days, hardest first each morning, and give them a time."""
    by_effort = sorted(selected, key=lambda activity: (-activity.effort_level, activity.id))
    planned: list[PlannedActivity] = []
    for day in range(1, days + 1):
        minute = day_start.hour * 60 + day_start.minute
        for activity in by_effort[day - 1 :: days]:
            if minute + activity.duration > 24 * 60:
                raise ValueError(f"Activities of day {day} don't fit in a single day")
            planned.append(
                PlannedActivity(
                    activity_id=activity.id,
                    order=len(planned) + 1,
                    day=day,
                    start_time=time(*divmod(minute, 60)),
                )
            )
            minute += activity.duration + break_minutes
    return planned


def evaluate_criteria(
    selected: list[Activity],
    activity_count: int,
    types: dict[str, int],
    categories: dict[int, int],
) -> list[BalanceCriterion]:
    """Return which balance criteria the selected activities meet."""
    type_counts = Counter(activity.activity_type_code for activity in selected)
    category_counts = Counter(activity.category_id for activity in selected)
    criteria = [
        BalanceCriterion(
            key="activity_count",
            target=activity_count,
            actual=len(selected),
            met=len(selected) == activity_count,
        )
    ]
    criteria += [
        BalanceCriterion(
            key="type_proportion",
            subject=code,
            target=target,
            actual=type_counts[code],
            met=type_counts[code] == target,
        )
        for code, target in types.items()
    ]
    criteria += [
        BalanceCriterion(
            key="category_coverage",
            subject=str(category_id),
            target=target,
            actual=category_counts[category_id],
            met=category_counts[category_id] >= target,
        )
        for category_id, target in categories.items()
    ]
    return criteria


def plan_itinerary(candidates: list[Activity], data: ItineraryGenerate) -> ItineraryPlan:
    """Choose, order and schedule the candidates following the generation parameters."""
    types = type_targets(data)
    categories = category_targets(data)
    selected = select_activities(candidates, data.activity_count, types, categories)
    return ItineraryPlan(
        compositions=schedule_activities(selected, data.days),
        criteria=evaluate_criteria(selected, data.activity_count, types, categories),
    )


def save_itinerary(
    db: Session, data: ItineraryGenerate, guide_id: int, plan: ItineraryPlan
) -> Itinerary:
    """Store a planned itinerary as pending, together with its generation parameters."""
    itinerary = Itinerary(
        creation_date=date.today(),
        activity_count=data.activity_count,
        package_id=data.package_id,
        guide_id=guide_id,
        proportion_types=[
            ProportionType(**proportion.model_dump()) for proportion in data.proportion_types
        ],
        proportion_categories=[
            ProportionCategory(**proportion.model_dump())
            for proportion in data.proportion_categories
        ],
        compositions=[
            ItineraryComposition(**planned.model_dump()) for planned in plan.compositions
        ],
    )
    db.add(itinerary)
    db.commit()
    db.refresh(itinerary)
    return itinerary

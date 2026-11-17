"""Report service: the RC queries behind the reports screens."""

from collections import Counter, defaultdict
from datetime import date, time

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.activity_type import ActivityType
from app.models.assignment import Assignment
from app.models.category import Category
from app.models.coverage import Coverage
from app.models.itinerary import Itinerary
from app.models.itinerary_composition import ItineraryComposition
from app.models.package import Package
from app.models.proportion_category import ProportionCategory
from app.models.proportion_type import ProportionType
from app.models.status import ItineraryStatus
from app.models.user.user import User
from app.schemas.report import (
    Rc1CategoryParam,
    Rc1ChartPoint,
    Rc1Report,
    Rc1Row,
    Rc1SortColumn,
    Rc1TypeParam,
    Rc5EffortChartPoint,
    Rc5Report,
    Rc5Row,
    Rc5Set,
    Rc5SortColumn,
    Rc5Summary,
    Rc5TypeChartPoint,
    Rc5TypeValue,
    SortOrder,
)


def _rc1_sort_column(sort: Rc1SortColumn):
    """Return the column the RC-1 rows are sorted by."""
    columns = {
        Rc1SortColumn.ID: Itinerary.id,
        Rc1SortColumn.PACKAGE: Package.name,
        Rc1SortColumn.CREATOR: User.name,
        Rc1SortColumn.CREATION_DATE: Itinerary.creation_date,
        Rc1SortColumn.STATUS: Itinerary.status,
        Rc1SortColumn.ACTIVITY_COUNT: Itinerary.activity_count,
    }
    return columns[sort]


def _rc1_filter(
    statement: Select,
    package_id: int | None,
    date_from: date | None,
    date_to: date | None,
) -> Select:
    """Restrict an RC-1 query to a package and a creation date range."""
    if package_id is not None:
        statement = statement.where(Itinerary.package_id == package_id)
    if date_from is not None:
        statement = statement.where(Itinerary.creation_date >= date_from)
    if date_to is not None:
        statement = statement.where(Itinerary.creation_date <= date_to)
    return statement


def _rc1_type_params(db: Session, itinerary_ids: list[int]) -> dict[int, list[Rc1TypeParam]]:
    """Return the activity type proportions of each itinerary, by itinerary id."""
    statement = (
        select(
            ProportionType.itinerary_id,
            ProportionType.activity_type_code,
            ActivityType.name,
            ProportionType.value,
        )
        .join(ActivityType, ActivityType.code == ProportionType.activity_type_code)
        .where(ProportionType.itinerary_id.in_(itinerary_ids))
        .order_by(ProportionType.activity_type_code)
    )
    params = defaultdict(list)
    for itinerary_id, code, name, value in db.execute(statement):
        params[itinerary_id].append(
            Rc1TypeParam(activity_type_code=code, activity_type_name=name, value=value)
        )
    return params


def _rc1_category_params(
    db: Session, itinerary_ids: list[int]
) -> dict[int, list[Rc1CategoryParam]]:
    """Return the category proportions of each itinerary, by itinerary id."""
    statement = (
        select(
            ProportionCategory.itinerary_id,
            ProportionCategory.category_id,
            Category.name,
            ProportionCategory.value,
        )
        .join(Category, Category.id == ProportionCategory.category_id)
        .where(ProportionCategory.itinerary_id.in_(itinerary_ids))
        .order_by(Category.name)
    )
    params = defaultdict(list)
    for itinerary_id, category_id, name, value in db.execute(statement):
        params[itinerary_id].append(
            Rc1CategoryParam(category_id=category_id, category_name=name, value=value)
        )
    return params


def rc1_generated_itineraries(
    db: Session,
    package_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort: Rc1SortColumn = Rc1SortColumn.CREATION_DATE,
    order: SortOrder = SortOrder.DESC,
) -> Rc1Report:
    """RC-1: generated itineraries with creator, date and parameters, plus the chart data."""
    column = _rc1_sort_column(sort)
    rows_statement = _rc1_filter(
        select(Itinerary, Package.name, User.name)
        .join(Package, Package.id == Itinerary.package_id)
        .join(User, User.id == Itinerary.guide_id),
        package_id,
        date_from,
        date_to,
    ).order_by(column.asc() if order is SortOrder.ASC else column.desc(), Itinerary.id)
    results = db.execute(rows_statement).all()

    itinerary_ids = [itinerary.id for itinerary, _, _ in results]
    type_params = _rc1_type_params(db, itinerary_ids)
    category_params = _rc1_category_params(db, itinerary_ids)
    rows = [
        Rc1Row(
            id=itinerary.id,
            package_id=itinerary.package_id,
            package_name=package_name,
            guide_id=itinerary.guide_id,
            creator=creator,
            creation_date=itinerary.creation_date,
            status=itinerary.status,
            activity_count=itinerary.activity_count,
            proportion_types=type_params[itinerary.id],
            proportion_categories=category_params[itinerary.id],
        )
        for itinerary, package_name, creator in results
    ]

    chart_statement = _rc1_filter(
        select(Itinerary.guide_id, User.name, Itinerary.status, func.count(Itinerary.id))
        .join(User, User.id == Itinerary.guide_id)
        .group_by(Itinerary.guide_id, User.name, Itinerary.status)
        .order_by(User.name, Itinerary.guide_id, Itinerary.status),
        package_id,
        date_from,
        date_to,
    )
    chart = [
        Rc1ChartPoint(guide_id=guide_id, creator=creator, status=status, count=count)
        for guide_id, creator, status, count in db.execute(chart_statement)
    ]
    return Rc1Report(rows=rows, chart=chart)


_RC5_TYPE_CODES = ("visita", "excursion", "taller")
_RC5_TYPE_ORDER = {code: index for index, code in enumerate(_RC5_TYPE_CODES)}
_RC5_BANDS = ("bajo", "medio", "alto")
_RC5_CRITERIA = 4
_RC5_LATE_HOUR = 17


def _rc5_quota(value: int, activity_count: int) -> int:
    """Return the activities a requested share stands for, as the generator does."""
    return (value * activity_count + 50) // 100


def _rc5_percentages(counts: Counter[str]) -> list[int]:
    """Return the three type shares adding up to 100, rounding the last to the remainder."""
    total = sum(counts[code] for code in _RC5_TYPE_CODES)
    if total == 0:
        return [0, 0, 0]
    visita = int(counts["visita"] * 100 / total + 0.5)
    excursion = int(counts["excursion"] * 100 / total + 0.5)
    return [visita, excursion, max(0, 100 - visita - excursion)]


def _rc5_sort_key(sort: Rc5SortColumn, row: Rc5Row):
    """Return the comparable value of a row for the requested sort column."""
    if sort is Rc5SortColumn.STATUS:
        return row.status.value
    if sort is Rc5SortColumn.PROPORTION:
        return tuple(row.proportion)
    if sort is Rc5SortColumn.COVERAGE:
        return row.covered_categories / row.package_categories if row.package_categories else 0
    if sort is Rc5SortColumn.ASSIGNED:
        return int(row.assigned)
    if sort is Rc5SortColumn.BALANCED:
        return int(row.balanced)
    return getattr(row, sort.value)


def rc5_compare_packages(
    db: Session,
    itinerary_set: Rc5Set = Rc5Set.ALL,
    date_from: date | None = None,
    date_to: date | None = None,
    sort: Rc5SortColumn = Rc5SortColumn.PACKAGE,
    order: SortOrder = SortOrder.ASC,
) -> Rc5Report:
    """RC-5: compare itineraries of different packages against their parametrization."""
    statement = select(Itinerary, Package.name).join(Package, Package.id == Itinerary.package_id)
    if itinerary_set is Rc5Set.ASSIGNED:
        statement = statement.join(Assignment, Assignment.itinerary_id == Itinerary.id).distinct()
    elif itinerary_set is not Rc5Set.ALL:
        statement = statement.where(Itinerary.status == ItineraryStatus(itinerary_set.value))
    if date_from is not None:
        statement = statement.where(Itinerary.creation_date >= date_from)
    if date_to is not None:
        statement = statement.where(Itinerary.creation_date <= date_to)
    selected = list(db.execute(statement.order_by(Package.name, Itinerary.id)))

    empty = Rc5Report(
        rows=[],
        type_chart=[],
        effort_chart=[],
        summary=Rc5Summary(
            itineraries=0, packages=0, activities=0, balanced=0, unbalanced=0, high_effort=0
        ),
    )
    if not selected:
        return empty

    itinerary_ids = [itinerary.id for itinerary, _ in selected]
    package_ids = {itinerary.package_id for itinerary, _ in selected}
    package_names = {itinerary.package_id: name for itinerary, name in selected}

    stops = defaultdict(list)
    for itinerary_id, code, category_id, effort, start in db.execute(
        select(
            ItineraryComposition.itinerary_id,
            Activity.activity_type_code,
            Activity.category_id,
            Activity.effort_level,
            ItineraryComposition.start_time,
        )
        .join(Activity, Activity.id == ItineraryComposition.activity_id)
        .where(ItineraryComposition.itinerary_id.in_(itinerary_ids))
    ):
        stops[itinerary_id].append((code, category_id, effort, start))

    assigned = {
        itinerary_id
        for (itinerary_id,) in db.execute(
            select(Assignment.itinerary_id)
            .where(Assignment.itinerary_id.in_(itinerary_ids))
            .distinct()
        )
    }
    type_params = defaultdict(dict)
    for itinerary_id, code, value in db.execute(
        select(
            ProportionType.itinerary_id,
            ProportionType.activity_type_code,
            ProportionType.value,
        ).where(ProportionType.itinerary_id.in_(itinerary_ids))
    ):
        type_params[itinerary_id][code] = value
    category_params = defaultdict(dict)
    for itinerary_id, category_id, value in db.execute(
        select(
            ProportionCategory.itinerary_id,
            ProportionCategory.category_id,
            ProportionCategory.value,
        ).where(ProportionCategory.itinerary_id.in_(itinerary_ids))
    ):
        category_params[itinerary_id][category_id] = value

    coverage = defaultdict(set)
    for package_id, category_id in db.execute(
        select(Coverage.package_id, Coverage.category_id).where(
            Coverage.package_id.in_(package_ids)
        )
    ):
        coverage[package_id].add(category_id)

    activity_types = sorted(
        db.execute(select(ActivityType.code, ActivityType.name)),
        key=lambda item: (_RC5_TYPE_ORDER.get(item[0], len(_RC5_TYPE_ORDER)), item[0]),
    )

    rows = []
    effort_bands = {}
    for itinerary, package_name in selected:
        activities = stops[itinerary.id]
        type_counts = Counter(code for code, *_ in activities)
        category_counts = Counter(category_id for _, category_id, _, _ in activities)
        bands = Counter(
            "bajo" if effort <= 1 else "medio" if effort == 2 else "alto"
            for _, _, effort, _ in activities
        )
        effort_bands[itinerary.id] = bands
        package_categories = coverage[itinerary.package_id]
        requested = itinerary.activity_count
        count_ok = len(activities) == requested
        type_ok = all(
            type_counts[code] == _rc5_quota(value, requested)
            for code, value in type_params[itinerary.id].items()
        )
        category_ok = all(
            category_counts[category_id] >= max(_rc5_quota(value, requested), 1 if value else 0)
            for category_id, value in category_params[itinerary.id].items()
        )
        late_ok = not any(
            effort >= 3 and start >= time(_RC5_LATE_HOUR, 0) for _, _, effort, start in activities
        )
        criteria_met = sum((count_ok, type_ok, category_ok, late_ok))
        rows.append(
            Rc5Row(
                id=itinerary.id,
                package_id=itinerary.package_id,
                package_name=package_name,
                creation_date=itinerary.creation_date,
                status=itinerary.status,
                assigned=itinerary.id in assigned,
                activity_count=len(activities),
                activity_types=[
                    Rc5TypeValue(
                        activity_type_code=code,
                        activity_type_name=name,
                        count=type_counts[code],
                    )
                    for code, name in activity_types
                ],
                proportion=_rc5_percentages(type_counts),
                covered_categories=len(package_categories.intersection(category_counts)),
                package_categories=len(package_categories),
                high_effort=bands["alto"],
                criteria_met=criteria_met,
                criteria_total=_RC5_CRITERIA,
                balanced=criteria_met == _RC5_CRITERIA,
            )
        )

    # Package and id stay ascending tiebreakers whatever direction was requested.
    rows.sort(key=lambda row: (row.package_name.casefold(), row.id))
    rows.sort(key=lambda row: _rc5_sort_key(sort, row), reverse=order is SortOrder.DESC)

    type_totals = defaultdict(lambda: {code: 0 for code in _RC5_TYPE_CODES})
    effort_totals = defaultdict(lambda: {band: 0 for band in _RC5_BANDS})
    for row in rows:
        counts = {value.activity_type_code: value.count for value in row.activity_types}
        for code in _RC5_TYPE_CODES:
            type_totals[row.package_id][code] += counts.get(code, 0)
        for band in _RC5_BANDS:
            effort_totals[row.package_id][band] += effort_bands[row.id][band]

    def by_package_name(package_id: int):
        return (package_names[package_id].casefold(), package_id)

    type_chart = sorted(
        (
            Rc5TypeChartPoint(
                package_id=package_id, package_name=package_names[package_id], **counts
            )
            for package_id, counts in type_totals.items()
        ),
        key=lambda point: by_package_name(point.package_id),
    )
    effort_chart = sorted(
        (
            Rc5EffortChartPoint(
                package_id=package_id, package_name=package_names[package_id], **counts
            )
            for package_id, counts in effort_totals.items()
        ),
        key=lambda point: by_package_name(point.package_id),
    )
    summary = Rc5Summary(
        itineraries=len(rows),
        packages=len(package_names),
        activities=sum(row.activity_count for row in rows),
        balanced=sum(row.balanced for row in rows),
        unbalanced=sum(not row.balanced for row in rows),
        high_effort=sum(row.high_effort for row in rows),
    )
    return Rc5Report(rows=rows, type_chart=type_chart, effort_chart=effort_chart, summary=summary)

"""Report service: the RC queries behind the reports screens."""

from collections import defaultdict
from datetime import date

from sqlalchemy import Select, and_, case, distinct, func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.activity_type import ActivityType
from app.models.assignment import Assignment
from app.models.category import Category
from app.models.itinerary import Itinerary
from app.models.membership import Membership
from app.models.package import Package
from app.models.proportion_category import ProportionCategory
from app.models.proportion_type import ProportionType
from app.models.status import VisitStatus
from app.models.travel_group import TravelGroup
from app.models.user.user import User
from app.models.visit import Visit
from app.schemas.report import (
    EffortLevel,
    Rc1CategoryParam,
    Rc1ChartPoint,
    Rc1Report,
    Rc1Row,
    Rc1SortColumn,
    Rc1TypeParam,
    Rc4ChartPoint,
    Rc4Group,
    Rc4Itinerary,
    Rc4Report,
    Rc4Row,
    Rc4SortColumn,
    Rc4Summary,
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


_EFFORT_LABELS = {
    EffortLevel.BAJO: "Bajo",
    EffortLevel.MEDIO: "Medio",
    EffortLevel.ALTO: "Alto",
}


def _effort_level(level: int) -> EffortLevel:
    """Map an activity's numeric effort level to the band shown in the report."""
    if level <= 1:
        return EffortLevel.BAJO
    if level == 2:
        return EffortLevel.MEDIO
    return EffortLevel.ALTO


def _effort_band():
    """Return the sortable numeric band of an activity's effort level."""
    return case(
        (Activity.effort_level <= 1, 1),
        (Activity.effort_level == 2, 2),
        else_=3,
    )


def _rc4_filter(
    statement: Select,
    itinerary_id: int | None,
    group_id: int | None,
) -> Select:
    """Restrict an RC-4 query to an itinerary and to visitors of a travel group."""
    statement = statement.join(
        Assignment,
        and_(
            Assignment.itinerary_id == Visit.itinerary_id,
            Assignment.tourist_id == Visit.tourist_id,
        ),
    )
    if itinerary_id is not None:
        statement = statement.where(Visit.itinerary_id == itinerary_id)
    if group_id is not None:
        statement = statement.join(Membership, Membership.tourist_id == Visit.tourist_id).where(
            Membership.travel_group_id == group_id
        )
    return statement


def _rc4_group_options_statement() -> Select:
    """Build the group options with GROUP BY so PostgreSQL accepts the case-insensitive ORDER BY."""
    return (
        select(TravelGroup.id, TravelGroup.name)
        .join(Membership, Membership.travel_group_id == TravelGroup.id)
        .join(Visit, Visit.tourist_id == Membership.tourist_id)
        .group_by(TravelGroup.id, TravelGroup.name)
        .order_by(func.lower(TravelGroup.name), TravelGroup.id)
    )


def rc4_tourist_experience(
    db: Session,
    itinerary_id: int | None = None,
    group_id: int | None = None,
    sort: Rc4SortColumn = Rc4SortColumn.EFFORT,
    order: SortOrder = SortOrder.ASC,
) -> Rc4Report:
    """RC-4: tourist experience of an itinerary's activities, by effort level."""
    done = Visit.status == VisitStatus.DONE
    visits = func.count(Visit.activity_id)
    completed = func.count(case((done, 1), else_=None))
    skipped = func.count(case((Visit.status == VisitStatus.SKIPPED, 1), else_=None))
    rated = func.count(case((done, Visit.rating), else_=None))
    rating_sum = func.coalesce(func.sum(case((done, Visit.rating), else_=0)), 0)
    satisfied = func.count(case((and_(done, Visit.rating >= 4), 1), else_=None))
    effort_band = _effort_band()

    rating_expr = case((rated > 0, rating_sum * 1.0 / rated), else_=None)
    satisfaction_expr = case((visits > 0, satisfied * 100.0 / visits), else_=0.0)
    abandonment_expr = case((visits > 0, skipped * 100.0 / visits), else_=0.0)
    sort_columns = {
        Rc4SortColumn.ACTIVITY_ID: Activity.id,
        Rc4SortColumn.ACTIVITY_NAME: func.lower(Activity.name),
        Rc4SortColumn.EFFORT: effort_band,
        Rc4SortColumn.VISITS: visits,
        Rc4SortColumn.COMPLETED: completed,
        Rc4SortColumn.RATING: rating_expr,
        Rc4SortColumn.SATISFACTION: satisfaction_expr,
        Rc4SortColumn.ABANDONMENT: abandonment_expr,
    }
    column = sort_columns[sort]
    primary = column.asc() if order is SortOrder.ASC else column.desc()

    rows_statement = _rc4_filter(
        select(
            Activity.id,
            Activity.name,
            Activity.effort_level,
            visits,
            completed,
            skipped,
            rated,
            rating_sum,
            satisfied,
        )
        .join(Activity, Activity.id == Visit.activity_id)
        .group_by(Activity.id, Activity.name, Activity.effort_level),
        itinerary_id,
        group_id,
    ).order_by(
        primary.nullslast(),
        visits.desc(),
        effort_band.asc(),
        func.lower(Activity.name).asc(),
        Activity.id.asc(),
    )
    entries = []
    for (
        activity_id,
        activity_name,
        effort_level,
        visit_count,
        completed_count,
        skipped_count,
        rated_count,
        rating_total,
        satisfied_count,
    ) in db.execute(rows_statement):
        entries.append(
            {
                "row": Rc4Row(
                    id=activity_id,
                    activity_name=activity_name,
                    effort=_effort_level(effort_level),
                    visits=visit_count,
                    completed=completed_count,
                    rating=(rating_total / rated_count) if rated_count else None,
                    satisfaction=(satisfied_count / visit_count * 100) if visit_count else 0.0,
                    abandonment=(skipped_count / visit_count * 100) if visit_count else 0.0,
                ),
                "effort": _effort_level(effort_level),
                "visits": visit_count,
                "skipped": skipped_count,
                "satisfied": satisfied_count,
                "rated": rated_count,
                "rating_sum": rating_total,
            }
        )
    rows = [entry["row"] for entry in entries]

    chart = []
    for effort in (EffortLevel.BAJO, EffortLevel.MEDIO, EffortLevel.ALTO):
        band = [entry for entry in entries if entry["effort"] is effort]
        band_visits = sum(entry["visits"] for entry in band)
        chart.append(
            Rc4ChartPoint(
                effort=effort,
                label=_EFFORT_LABELS[effort],
                satisfaction=(
                    sum(entry["satisfied"] for entry in band) / band_visits * 100
                    if band_visits
                    else 0.0
                ),
                abandonment=(
                    sum(entry["skipped"] for entry in band) / band_visits * 100
                    if band_visits
                    else 0.0
                ),
            )
        )

    tourists_statement = _rc4_filter(
        select(func.count(distinct(Visit.tourist_id))), itinerary_id, group_id
    )
    total_visits = sum(entry["visits"] for entry in entries)
    total_rated = sum(entry["rated"] for entry in entries)
    summary = Rc4Summary(
        visits=total_visits,
        completed=sum(row.completed for row in rows),
        skipped=sum(entry["skipped"] for entry in entries),
        rated=total_rated,
        tourists=db.scalar(tourists_statement) or 0,
        rating=(
            sum(entry["rating_sum"] for entry in entries) / total_rated if total_rated else None
        ),
        satisfaction=(
            sum(entry["satisfied"] for entry in entries) / total_visits * 100
            if total_visits
            else 0.0
        ),
        abandonment=(
            sum(entry["skipped"] for entry in entries) / total_visits * 100 if total_visits else 0.0
        ),
    )

    itineraries_statement = (
        select(Itinerary.id, Package.name)
        .join(Package, Package.id == Itinerary.package_id)
        .join(Visit, Visit.itinerary_id == Itinerary.id)
        .distinct()
        .order_by(Itinerary.id.desc())
    )
    itineraries = [
        Rc4Itinerary(id=itinerary_id, package_name=package_name)
        for itinerary_id, package_name in db.execute(itineraries_statement)
    ]
    groups_statement = _rc4_group_options_statement()
    groups = [Rc4Group(id=group_id, name=name) for group_id, name in db.execute(groups_statement)]
    return Rc4Report(
        rows=rows,
        chart=chart,
        summary=summary,
        itineraries=itineraries,
        groups=groups,
    )

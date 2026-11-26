"""Report service: the RC queries behind the reports screens."""

from collections import defaultdict
from datetime import date

from sqlalchemy import Select, case, func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.activity_type import ActivityType
from app.models.category import Category
from app.models.itinerary import Itinerary
from app.models.itinerary_composition import ItineraryComposition
from app.models.package import Package
from app.models.proportion_category import ProportionCategory
from app.models.proportion_type import ProportionType
from app.models.status import ItineraryStatus
from app.models.user.user import User
from app.schemas.report import (
    EffortLevel,
    Rc1CategoryParam,
    Rc1ChartPoint,
    Rc1Report,
    Rc1Row,
    Rc1SortColumn,
    Rc1TypeParam,
    Rc2ChartPoint,
    Rc2Report,
    Rc2Row,
    Rc2SortColumn,
    Rc2Summary,
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


def _effort_level(level: int) -> EffortLevel:
    """Map an activity's numeric effort level to the band shown in the report."""
    if level <= 1:
        return EffortLevel.LOW
    if level == 2:
        return EffortLevel.MEDIUM
    return EffortLevel.HIGH


def _rc2_sort_column(sort: Rc2SortColumn):
    """Return the expression the RC-2 rows are sorted by."""
    uses = func.count(ItineraryComposition.itinerary_id)
    effort_band = case(
        (Activity.effort_level <= 1, 1),
        (Activity.effort_level == 2, 2),
        else_=3,
    )
    columns = {
        Rc2SortColumn.ACTIVITY_ID: Activity.id,
        Rc2SortColumn.ACTIVITY_NAME: Activity.name,
        Rc2SortColumn.CATEGORY_ID: Category.id,
        Rc2SortColumn.CATEGORY: Category.name,
        Rc2SortColumn.ACTIVITY_TYPE_CODE: ActivityType.code,
        Rc2SortColumn.ACTIVITY_TYPE: ActivityType.name,
        Rc2SortColumn.EFFORT: effort_band,
        Rc2SortColumn.USES: uses,
        # Both are the same order: every row divides its uses by the same total.
        Rc2SortColumn.PERCENTAGE: uses,
    }
    return columns[sort]


def _rc2_filter(
    statement: Select,
    package_id: int | None,
    date_from: date | None,
    date_to: date | None,
) -> Select:
    """Restrict an RC-2 query to final itineraries of a package and a creation date range."""
    statement = statement.where(Itinerary.status == ItineraryStatus.APPROVED)
    if package_id is not None:
        statement = statement.where(Itinerary.package_id == package_id)
    if date_from is not None:
        statement = statement.where(Itinerary.creation_date >= date_from)
    if date_to is not None:
        statement = statement.where(Itinerary.creation_date <= date_to)
    return statement


def rc2_most_used_activities(
    db: Session,
    package_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort: Rc2SortColumn = Rc2SortColumn.USES,
    order: SortOrder = SortOrder.DESC,
) -> Rc2Report:
    """RC-2: activities used in final itineraries, grouped by effort and category."""
    column = _rc2_sort_column(sort)
    uses_statement = _rc2_filter(
        select(
            Activity.id,
            Activity.name,
            Category.id,
            Category.name,
            ActivityType.code,
            ActivityType.name,
            Activity.effort_level,
            func.count(ItineraryComposition.itinerary_id).label("uses"),
        )
        .join(Activity, Activity.id == ItineraryComposition.activity_id)
        .join(Category, Category.id == Activity.category_id)
        .join(ActivityType, ActivityType.code == Activity.activity_type_code)
        .join(Itinerary, Itinerary.id == ItineraryComposition.itinerary_id)
        .group_by(
            Activity.id,
            Activity.name,
            Category.id,
            Category.name,
            ActivityType.code,
            ActivityType.name,
            Activity.effort_level,
        ),
        package_id,
        date_from,
        date_to,
    ).order_by(
        column.asc() if order is SortOrder.ASC else column.desc(),
        Activity.id,
    )
    results = db.execute(uses_statement).all()

    total_uses = sum(uses for *_, uses in results)
    rows = [
        Rc2Row(
            activity_id=activity_id,
            activity_name=activity_name,
            category_id=category_id,
            category_name=category_name,
            activity_type_code=type_code,
            activity_type_name=type_name,
            effort=_effort_level(effort_level),
            uses=uses,
            percentage=(uses / total_uses * 100) if total_uses else 0.0,
        )
        for (
            activity_id,
            activity_name,
            category_id,
            category_name,
            type_code,
            type_name,
            effort_level,
            uses,
        ) in results
    ]

    chart_by_category: dict[int, Rc2ChartPoint] = {}
    for row in rows:
        point = chart_by_category.get(row.category_id)
        if point is None:
            point = Rc2ChartPoint(
                category_id=row.category_id,
                category=row.category_name,
                low=0,
                medium=0,
                high=0,
            )
            chart_by_category[row.category_id] = point
        setattr(point, row.effort.value, getattr(point, row.effort.value) + row.uses)
    chart = sorted(
        chart_by_category.values(),
        key=lambda point: (-(point.low + point.medium + point.high), point.category),
    )

    finals_statement = _rc2_filter(select(func.count(Itinerary.id)), package_id, date_from, date_to)
    summary = Rc2Summary(
        final_itineraries=db.scalar(finals_statement) or 0,
        distinct_activities=len(rows),
        total_uses=total_uses,
        high_effort_uses=sum(row.uses for row in rows if row.effort is EffortLevel.HIGH),
    )
    return Rc2Report(rows=rows, chart=chart, summary=summary)

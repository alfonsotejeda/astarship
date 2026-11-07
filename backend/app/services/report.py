"""Report service: the RC queries behind the reports screens."""

from collections import defaultdict
from datetime import date

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.activity_type import ActivityType
from app.models.category import Category
from app.models.itinerary import Itinerary
from app.models.package import Package
from app.models.proportion_category import ProportionCategory
from app.models.proportion_type import ProportionType
from app.models.user.user import User
from app.schemas.report import (
    Rc1CategoryParam,
    Rc1ChartPoint,
    Rc1Report,
    Rc1Row,
    Rc1SortColumn,
    Rc1TypeParam,
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

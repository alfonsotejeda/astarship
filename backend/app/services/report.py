"""Report service: the RC queries behind the reports screens."""

from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from math import sqrt

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.activity_type import ActivityType
from app.models.category import Category
from app.models.itinerary import Itinerary
from app.models.membership import Membership
from app.models.modification_request import ModificationRequest
from app.models.package import Package
from app.models.proportion_category import ProportionCategory
from app.models.proportion_type import ProportionType
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
    Rc6AbandonmentRow,
    Rc6EffortSummary,
    Rc6PackagePoint,
    Rc6Report,
    Rc6RequesterRow,
    Rc6ScatterPoint,
    Rc6Summary,
    Rc6Trend,
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


_RC6_BANDS = (EffortLevel.BAJO, EffortLevel.MEDIO, EffortLevel.ALTO)
_RC6_VALUES = {EffortLevel.BAJO: 1, EffortLevel.MEDIO: 2, EffortLevel.ALTO: 3}
_RC6_LABELS = {EffortLevel.BAJO: "Bajo", EffortLevel.MEDIO: "Medio", EffortLevel.ALTO: "Alto"}
_RC6_DONE = "done"
_RC6_TOP_ABANDONMENT = 10


def _rc6_band(level: int) -> EffortLevel:
    """Turn the activity's numeric effort level into a report band."""
    if level <= 1:
        return EffortLevel.BAJO
    if level == 2:
        return EffortLevel.MEDIO
    return EffortLevel.ALTO


@dataclass
class _Rc6Totals:
    """Counts behind a mean rating and an abandonment rate."""

    visits: int = 0
    completed: int = 0
    skipped: int = 0
    rated: int = 0
    rating_sum: int = 0

    def add(self, status: str, rating: int | None) -> None:
        """Account for one visit, counting only completed rated visits in the mean."""
        self.visits += 1
        if status == _RC6_DONE:
            self.completed += 1
            if rating is not None:
                self.rated += 1
                self.rating_sum += rating
        else:
            self.skipped += 1

    def absorb(self, other: "_Rc6Totals") -> None:
        """Add up another set of counts."""
        self.visits += other.visits
        self.completed += other.completed
        self.skipped += other.skipped
        self.rated += other.rated
        self.rating_sum += other.rating_sum

    @property
    def rating(self) -> float | None:
        """Mean rating of the completed visits, or None when none was rated."""
        return self.rating_sum / self.rated if self.rated else None

    @property
    def abandonment(self) -> float:
        """Percentage of visits the tourists skipped."""
        return self.skipped * 100 / self.visits if self.visits else 0.0


@dataclass(frozen=True)
class _Rc6Visit:
    """A visit reduced to the fields the report aggregates by."""

    tourist_id: int
    activity_id: int
    package_id: int
    effort: EffortLevel
    status: str
    rating: int | None


@dataclass(frozen=True)
class _Rc6Activity:
    """Identity of an activity in the report, including the guide who created it."""

    name: str
    package_id: int
    package_name: str
    effort: EffortLevel
    guide_id: int
    guide_name: str


def _rc6_visit_rows(
    db: Session,
    package_id: int | None,
    date_from: date | None,
    date_to: date | None,
) -> tuple[list[_Rc6Visit], dict[tuple[int, int], _Rc6Activity]]:
    """Read the visits in the period with their package, activity and creator details."""
    statement = (
        select(
            Visit.tourist_id,
            Visit.activity_id,
            Visit.status,
            Visit.rating,
            Itinerary.package_id,
            Package.name,
            Activity.name,
            Activity.effort_level,
            Activity.guide_id,
            User.name,
        )
        .join(Itinerary, Itinerary.id == Visit.itinerary_id)
        .join(Package, Package.id == Itinerary.package_id)
        .join(Activity, Activity.id == Visit.activity_id)
        .join(User, User.id == Activity.guide_id)
    )
    if package_id is not None:
        statement = statement.where(Itinerary.package_id == package_id)
    if date_from is not None:
        statement = statement.where(Visit.assignment_date >= date_from)
    if date_to is not None:
        statement = statement.where(Visit.assignment_date <= date_to)
    statement = statement.order_by(Package.name, Activity.name, Activity.id, Visit.tourist_id)

    visits: list[_Rc6Visit] = []
    activities: dict[tuple[int, int], _Rc6Activity] = {}
    for (
        tourist_id,
        activity_id,
        status,
        rating,
        visit_package_id,
        package_name,
        activity_name,
        effort_level,
        guide_id,
        guide_name,
    ) in db.execute(statement):
        visits.append(
            _Rc6Visit(
                tourist_id=tourist_id,
                activity_id=activity_id,
                package_id=visit_package_id,
                effort=_rc6_band(effort_level),
                status=status,
                rating=rating,
            )
        )
        activities[(activity_id, visit_package_id)] = _Rc6Activity(
            name=activity_name,
            package_id=visit_package_id,
            package_name=package_name,
            effort=_rc6_band(effort_level),
            guide_id=guide_id,
            guide_name=guide_name,
        )
    return visits, activities


def _rc6_request_rows(
    db: Session,
    package_id: int | None,
    date_from: date | None,
    date_to: date | None,
) -> list[tuple[int, int, str, str]]:
    """Read modification requests with the tourist, package and their names."""
    statement = (
        select(ModificationRequest.tourist_id, Itinerary.package_id, Package.name, User.name)
        .join(Itinerary, Itinerary.id == ModificationRequest.itinerary_id)
        .join(Package, Package.id == Itinerary.package_id)
        .join(User, User.id == ModificationRequest.tourist_id)
    )
    if package_id is not None:
        statement = statement.where(Itinerary.package_id == package_id)
    if date_from is not None:
        statement = statement.where(func.date(ModificationRequest.request_date) >= date_from)
    if date_to is not None:
        statement = statement.where(func.date(ModificationRequest.request_date) <= date_to)
    statement = statement.order_by(User.name, ModificationRequest.tourist_id, Itinerary.package_id)
    return [
        (tourist_id, pkg_id, package_name, tourist_name)
        for tourist_id, pkg_id, package_name, tourist_name in db.execute(statement)
    ]


def _rc6_trend(points: list[Rc6ScatterPoint]) -> Rc6Trend | None:
    """Fit a line to the dispersion points and compute their Pearson coefficient."""
    count = len(points)
    if count < 2:
        return None
    mean_x = sum(point.effort_value for point in points) / count
    mean_y = sum(point.rating for point in points) / count
    variance_x = sum((point.effort_value - mean_x) ** 2 for point in points)
    if variance_x == 0:
        return None
    covariance = sum((point.effort_value - mean_x) * (point.rating - mean_y) for point in points)
    slope = covariance / variance_x
    intercept = mean_y - slope * mean_x
    variance_y = sum((point.rating - mean_y) ** 2 for point in points)
    correlation = covariance / sqrt(variance_x * variance_y) if variance_y else None
    return Rc6Trend(
        slope=slope,
        intercept=intercept,
        correlation=correlation,
        from_=(1, intercept + slope),
        to=(3, intercept + slope * 3),
    )


def rc6_effort_and_rating(
    db: Session,
    package_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> Rc6Report:
    """RC-6: correlate effort with ratings, rank abandonment and compare requesters."""
    visits, activities = _rc6_visit_rows(db, package_id, date_from, date_to)

    totals = _Rc6Totals()
    by_package_effort: dict[tuple[int, EffortLevel], _Rc6Totals] = defaultdict(_Rc6Totals)
    by_activity: dict[tuple[int, int], _Rc6Totals] = defaultdict(_Rc6Totals)
    by_effort: dict[EffortLevel, _Rc6Totals] = defaultdict(_Rc6Totals)
    by_tourist_package: dict[tuple[int, int], _Rc6Totals] = defaultdict(_Rc6Totals)
    for visit in visits:
        for accumulator in (
            totals,
            by_package_effort[(visit.package_id, visit.effort)],
            by_activity[(visit.activity_id, visit.package_id)],
            by_effort[visit.effort],
            by_tourist_package[(visit.tourist_id, visit.package_id)],
        ):
            accumulator.add(visit.status, visit.rating)

    package_names = {activity.package_id: activity.package_name for activity in activities.values()}

    # Dispersion: one point per package and effort band, only where there is a rating
    scatter = [
        Rc6ScatterPoint(
            package_id=package_id,
            package_name=package_names[package_id],
            effort=effort,
            effort_value=_RC6_VALUES[effort],
            visits=counts.visits,
            rated=counts.rated,
            rating=counts.rating,
        )
        for (package_id, effort), counts in by_package_effort.items()
        if counts.rated
    ]
    scatter.sort(
        key=lambda point: (point.package_name.casefold(), point.package_id, point.effort_value)
    )
    trend = _rc6_trend(scatter)

    # Grouped bars: one row per package with a rating, leaving unrated bands empty
    rated_packages = {
        package_id for (package_id, _), counts in by_package_effort.items() if counts.rated
    }
    package_chart = [
        Rc6PackagePoint(
            package_id=package_id,
            package_name=package_names[package_id],
            **{
                band.value: by_package_effort[(package_id, band)].rating
                if (package_id, band) in by_package_effort
                else None
                for band in _RC6_BANDS
            },
        )
        for package_id in rated_packages
    ]
    package_chart.sort(key=lambda point: (point.package_name.casefold(), point.package_id))

    effort_summary = [
        Rc6EffortSummary(
            effort=band,
            label=_RC6_LABELS[band],
            visits=by_effort[band].visits,
            rated=by_effort[band].rated,
            rating=by_effort[band].rating,
            abandonment=by_effort[band].abandonment,
        )
        for band in _RC6_BANDS
    ]

    # Top abandoned activities: an activity shared by two packages gets one row per package
    abandonment = [
        Rc6AbandonmentRow(
            id=f"{activity_id}-{package_id}",
            activity_id=activity_id,
            activity_name=activities[(activity_id, package_id)].name,
            effort=activities[(activity_id, package_id)].effort,
            package_id=package_id,
            package_name=package_names[package_id],
            guide_id=activities[(activity_id, package_id)].guide_id,
            guide_name=activities[(activity_id, package_id)].guide_name,
            visits=counts.visits,
            completed=counts.completed,
            skipped=counts.skipped,
            abandonment=counts.abandonment,
            rating=counts.rating,
        )
        for (activity_id, package_id), counts in by_activity.items()
    ]
    abandonment.sort(
        key=lambda row: (
            -row.abandonment,
            -row.visits,
            row.activity_name.casefold(),
            row.activity_id,
            row.package_id,
        )
    )
    abandonment = abandonment[:_RC6_TOP_ABANDONMENT]

    # A requester is compared with each of their groups, in the package of the request.
    # Travel groups are N:M with tourists and have no package of their own: the package
    # is fixed by the request and by the visits of the members' assignments.
    requests = _rc6_request_rows(db, package_id, date_from, date_to)
    request_counts: dict[tuple[int, int], int] = defaultdict(int)
    request_names: dict[tuple[int, int], tuple[str, str]] = {}
    for tourist_id, request_package_id, package_name, tourist_name in requests:
        key = (tourist_id, request_package_id)
        request_counts[key] += 1
        if key not in request_names:
            package_names[request_package_id] = package_name
            request_names[key] = (tourist_name, package_name)

    groups_by_tourist: dict[int, list[int]] = defaultdict(list)
    members_by_group: dict[int, set[int]] = defaultdict(set)
    for group_id, tourist_id in db.execute(
        select(Membership.travel_group_id, Membership.tourist_id)
    ):
        groups_by_tourist[tourist_id].append(group_id)
        members_by_group[group_id].add(tourist_id)
    group_names = {
        group_id: name for group_id, name in db.execute(select(TravelGroup.id, TravelGroup.name))
    }

    requesters = []
    for (tourist_id, request_package_id), count in request_counts.items():
        tourist_name, package_name = request_names[(tourist_id, request_package_id)]
        own = by_tourist_package.get((tourist_id, request_package_id), _Rc6Totals())
        for group_id in sorted(groups_by_tourist.get(tourist_id, [])):
            group = _Rc6Totals()
            for member_id in members_by_group[group_id]:
                if member_id == tourist_id:
                    continue
                member = by_tourist_package.get((member_id, request_package_id))
                if member is not None:
                    group.absorb(member)
            requesters.append(
                Rc6RequesterRow(
                    id=f"{tourist_id}-{group_id}-{request_package_id}",
                    tourist_id=tourist_id,
                    tourist_name=tourist_name,
                    group_id=group_id,
                    group_name=group_names[group_id],
                    package_id=request_package_id,
                    package_name=package_name,
                    requests=count,
                    visits=own.visits,
                    rated=own.rated,
                    rating=own.rating,
                    group_rating=group.rating,
                    difference=(
                        own.rating - group.rating
                        if own.rating is not None and group.rating is not None
                        else None
                    ),
                )
            )
    requesters.sort(
        key=lambda row: (
            row.tourist_name.casefold(),
            row.tourist_id,
            row.group_name.casefold(),
            row.package_name.casefold(),
        )
    )

    summary = Rc6Summary(
        packages=len(
            {visit.package_id for visit in visits}
            | {request_package_id for _, request_package_id, _, _ in requests}
        ),
        activities=len({visit.activity_id for visit in visits}),
        visits=totals.visits,
        completed=totals.completed,
        skipped=totals.skipped,
        rated=totals.rated,
        rating=totals.rating,
        abandonment=totals.abandonment,
        requesters=len({row.tourist_id for row in requesters}),
        requests=len(requests),
    )
    return Rc6Report(
        scatter=scatter,
        package_chart=package_chart,
        effort_summary=effort_summary,
        abandonment=abandonment,
        requesters=requesters,
        trend=trend,
        summary=summary,
    )

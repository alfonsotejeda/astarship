import { ApiError } from "@/lib/api/client";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import type {
  Rc6AbandonmentRow,
  Rc6EffortSummary,
  Rc6PackagePoint,
  Rc6Report,
  Rc6RequesterRow,
  Rc6ScatterPoint,
  Rc6Summary,
  Rc6Trend,
} from "@/lib/api/reports";
import type { VisitStatus } from "@/lib/api/trips";
import { findActivityRecord } from "../data/activities";
import type { ActivityRecord } from "../data/activities";
import { assignments, visits } from "../data/assignments";
import type { AssignmentRecord } from "../data/assignments";
import { memberships, travelGroups } from "../data/groups";
import type { TravelGroupRecord } from "../data/groups";
import { itineraries } from "../data/itineraries";
import type { ItineraryRecord } from "../data/itineraries";
import type { PackageRecord } from "../data/packages";
import { modificationRequests } from "../data/requests";
import type { ModificationRequestRecord } from "../data/requests";
import { findUser } from "../data/users";
import type { MockRoute } from "../types";
import { packageOf } from "./itineraries";
import { addDays } from "./trips";

// Mock for GET /reports/rc6 until backend #60 exists. It reuses the demo visits,
// modification requests and travel groups.
const EFFORT_LEVELS: EffortLevel[] = ["bajo", "medio", "alto"];
const EFFORT_ORDER: Record<EffortLevel, number> = { bajo: 1, medio: 2, alto: 3 };
const EFFORT_VALUE: Record<EffortLevel, number> = { bajo: 1, medio: 2, alto: 3 };
const EFFORT_LABEL: Record<EffortLevel, string> = { bajo: "Bajo", medio: "Medio", alto: "Alto" };
const TOP_ABANDONMENT = 10;

// Same as the backend: every role but the tourist
function checkCanReport(userId: number) {
  if (findUser(userId)?.role === "tourist") throw new ApiError(403, "Los turistas no tienen acceso a los reportes.");
}

function effortBand(level: number): EffortLevel {
  if (level <= 1) return "bajo";
  if (level === 2) return "medio";
  return "alto";
}

function inRange(date: string, from: string | null, to: string | null) {
  return (!from || date >= from) && (!to || date <= to);
}

function percent(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

type Totals = {
  visits: number;
  completed: number;
  skipped: number;
  rated: number;
  ratingSum: number;
};

function emptyTotals(): Totals {
  return { visits: 0, completed: 0, skipped: 0, rated: 0, ratingSum: 0 };
}

function addVisit(totals: Totals, status: VisitStatus, rating: number | null) {
  totals.visits += 1;
  if (status === "done") {
    totals.completed += 1;
    if (rating !== null) {
      totals.rated += 1;
      totals.ratingSum += rating;
    }
  } else {
    totals.skipped += 1;
  }
}

function average(totals: Totals) {
  return totals.rated > 0 ? totals.ratingSum / totals.rated : null;
}

type VisitEntry = {
  itinerary: ItineraryRecord;
  assignment: AssignmentRecord;
  activity: ActivityRecord;
  package: PackageRecord;
  date: string;
  status: VisitStatus;
  rating: number | null;
};

// The day of the trip the activity was on, so the visit gets its date
function dayIndex(itinerary: ItineraryRecord, activityId: number) {
  return itinerary.days.findIndex(day => day.stops.some(([id]) => id === activityId));
}

function visitEntries(): VisitEntry[] {
  return visits.flatMap(visit => {
    const assignment = assignments.find(
      item => item.itinerary_id === visit.itinerary_id && item.user_id === visit.user_id,
    );
    const itinerary = itineraries.find(item => item.id === visit.itinerary_id);
    const activity = findActivityRecord(visit.activity_id);
    if (!assignment || !itinerary || !activity) return [];

    const index = dayIndex(itinerary, visit.activity_id);
    if (index < 0) return [];

    return [
      {
        itinerary,
        assignment,
        activity,
        package: packageOf(itinerary),
        date: addDays(assignment.start_date, index),
        status: visit.status,
        rating: visit.rating,
      },
    ];
  });
}

function summarize(entries: VisitEntry[]): Totals {
  const totals = emptyTotals();
  for (const entry of entries) addVisit(totals, entry.status, entry.rating);
  return totals;
}

// Linear regression and Pearson coefficient over the dispersion points
function trendOf(points: Rc6ScatterPoint[]): Rc6Trend | null {
  if (points.length < 2) return null;

  const count = points.length;
  const meanX = points.reduce((sum, point) => sum + point.effort_value, 0) / count;
  const meanY = points.reduce((sum, point) => sum + point.rating, 0) / count;
  const varianceX = points.reduce((sum, point) => sum + (point.effort_value - meanX) ** 2, 0);
  if (varianceX === 0) return null;

  const covariance = points.reduce(
    (sum, point) => sum + (point.effort_value - meanX) * (point.rating - meanY),
    0,
  );
  const slope = covariance / varianceX;
  const intercept = meanY - slope * meanX;
  const varianceY = points.reduce((sum, point) => sum + (point.rating - meanY) ** 2, 0);
  const correlation = varianceY === 0 ? null : covariance / Math.sqrt(varianceX * varianceY);

  return {
    slope,
    intercept,
    correlation,
    from: [1, intercept + slope],
    to: [3, intercept + slope * 3],
  };
}

type ActivityAccumulator = Totals & {
  activity: ActivityRecord;
  package: PackageRecord;
};

type RequestEntry = {
  request: ModificationRequestRecord;
  package: PackageRecord;
};

function rc6Report(query: URLSearchParams): Rc6Report {
  const rawPackage = query.get("package_id");
  const packageId = rawPackage && Number.isInteger(Number(rawPackage)) ? Number(rawPackage) : null;
  const from = query.get("date_from") || null;
  const to = query.get("date_to") || null;

  const selected = visitEntries().filter(
    entry =>
      (packageId === null || entry.package.id === packageId) && inRange(entry.date, from, to),
  );

  // Dispersion and per-package averages: one accumulator per package and effort
  type RatingAccumulator = {
    package: PackageRecord;
    effort: EffortLevel;
    visits: number;
    rated: number;
    ratingSum: number;
  };
  const byPackageEffort = new Map<string, RatingAccumulator>();
  for (const entry of selected) {
    const effort = effortBand(entry.activity.effort_level);
    const key = `${entry.package.id}-${effort}`;
    const accumulator = byPackageEffort.get(key) ?? {
      package: entry.package,
      effort,
      visits: 0,
      rated: 0,
      ratingSum: 0,
    };
    accumulator.visits += 1;
    if (entry.status === "done" && entry.rating !== null) {
      accumulator.rated += 1;
      accumulator.ratingSum += entry.rating;
    }
    byPackageEffort.set(key, accumulator);
  }

  const byPackageName = (a: { package_name: string }, b: { package_name: string }) =>
    a.package_name.localeCompare(b.package_name, "es");

  const scatter: Rc6ScatterPoint[] = [...byPackageEffort.values()]
    .filter(item => item.rated > 0)
    .map(item => ({
      package_id: item.package.id,
      package_name: item.package.name,
      effort: item.effort,
      effort_value: EFFORT_VALUE[item.effort],
      rating: item.ratingSum / item.rated,
      visits: item.visits,
      rated: item.rated,
    }))
    .sort(
      (a, b) =>
        byPackageName(a, b) ||
        EFFORT_ORDER[a.effort] - EFFORT_ORDER[b.effort],
    );

  // One bar group per package, with the average rating at each effort level
  const packageMap = new Map<number, { package: PackageRecord; efforts: Partial<Record<EffortLevel, number>> }>();
  for (const item of byPackageEffort.values()) {
    const current = packageMap.get(item.package.id) ?? { package: item.package, efforts: {} };
    if (item.rated > 0) current.efforts[item.effort] = item.ratingSum / item.rated;
    packageMap.set(item.package.id, current);
  }

  const packageChart: Rc6PackagePoint[] = [...packageMap.values()]
    .map(({ package: pkg, efforts }) => ({
      package_id: pkg.id,
      package_name: pkg.name,
      bajo: efforts.bajo ?? null,
      medio: efforts.medio ?? null,
      alto: efforts.alto ?? null,
    }))
    .sort(byPackageName);

  const effortSummary: Rc6EffortSummary[] = EFFORT_LEVELS.map(effort => {
    const totals = summarize(selected.filter(entry => effortBand(entry.activity.effort_level) === effort));
    return {
      effort,
      label: EFFORT_LABEL[effort],
      visits: totals.visits,
      rated: totals.rated,
      rating: average(totals),
      abandonment: percent(totals.skipped, totals.visits),
    };
  });

  // Abandonment: one row per activity and package, with its creator guide
  const byActivity = new Map<string, ActivityAccumulator>();
  for (const entry of selected) {
    const key = `${entry.activity.id}-${entry.package.id}`;
    const accumulator =
      byActivity.get(key) ??
      Object.assign(emptyTotals(), { activity: entry.activity, package: entry.package });
    addVisit(accumulator, entry.status, entry.rating);
    byActivity.set(key, accumulator);
  }

  const abandonment: Rc6AbandonmentRow[] = [...byActivity.values()]
    .map(item => ({
      id: `${item.activity.id}-${item.package.id}`,
      activity_id: item.activity.id,
      activity_name: item.activity.name,
      effort: effortBand(item.activity.effort_level),
      package_id: item.package.id,
      package_name: item.package.name,
      guide_id: item.activity.user_id,
      guide_name: findUser(item.activity.user_id)?.name ?? "",
      visits: item.visits,
      completed: item.completed,
      skipped: item.skipped,
      abandonment: percent(item.skipped, item.visits),
      rating: average(item),
    }))
    .sort(
      (a, b) =>
        b.abandonment - a.abandonment ||
        b.visits - a.visits ||
        a.activity_name.localeCompare(b.activity_name, "es"),
    )
    .slice(0, TOP_ABANDONMENT);

  // Modification requests of the period, with the package of their itinerary
  const requestEntries: RequestEntry[] = modificationRequests.flatMap((request): RequestEntry[] => {
    const itinerary = itineraries.find(item => item.id === request.itinerary_id);
    if (!itinerary) return [];
    const pkg = packageOf(itinerary);
    if (packageId !== null && pkg.id !== packageId) return [];
    if (!inRange(request.request_date, from, to)) return [];
    return [{ request, package: pkg }];
  });

  // A tourist may belong to several groups; the comparison is made against each matching group
  type RequesterAccumulator = {
    tourist_id: number;
    group: TravelGroupRecord;
    package: PackageRecord;
    requests: number;
  };
  const byRequester = new Map<string, RequesterAccumulator>();
  for (const entry of requestEntries) {
    const groups = memberships
      .filter(item => item.tourist_id === entry.request.tourist_id)
      .flatMap(item => {
        const group = travelGroups.find(record => record.id === item.travel_group_id);
        return group && group.package_id === entry.package.id ? [group] : [];
      });

    for (const group of groups) {
      const key = `${entry.request.tourist_id}-${group.id}-${entry.package.id}`;
      const current = byRequester.get(key);
      if (current) current.requests += 1;
      else
        byRequester.set(key, {
          tourist_id: entry.request.tourist_id,
          group,
          package: entry.package,
          requests: 1,
        });
    }
  }

  const requesters: Rc6RequesterRow[] = [...byRequester.values()]
    .map(item => {
      const own = summarize(
        selected.filter(
          entry => entry.package.id === item.package.id && entry.assignment.user_id === item.tourist_id,
        ),
      );
      const groupMembers = new Set(
        memberships
          .filter(membership => membership.travel_group_id === item.group.id)
          .map(membership => membership.tourist_id),
      );
      const group = summarize(
        selected.filter(
          entry => entry.package.id === item.package.id && groupMembers.has(entry.assignment.user_id),
        ),
      );
      const rating = average(own);
      const groupRating = average(group);

      return {
        id: `${item.tourist_id}-${item.group.id}-${item.package.id}`,
        tourist_id: item.tourist_id,
        tourist_name: findUser(item.tourist_id)?.name ?? "",
        group_id: item.group.id,
        group_name: item.group.name,
        package_id: item.package.id,
        package_name: item.package.name,
        requests: item.requests,
        visits: own.visits,
        rated: own.rated,
        rating,
        group_rating: groupRating,
        difference: rating !== null && groupRating !== null ? rating - groupRating : null,
      };
    })
    .sort(
      (a, b) =>
        a.tourist_name.localeCompare(b.tourist_name, "es") ||
        a.group_name.localeCompare(b.group_name, "es"),
    );

  const totals = summarize(selected);
  const packageIds = new Set<number>([
    ...selected.map(entry => entry.package.id),
    ...requestEntries.map(entry => entry.package.id),
  ]);

  const summary: Rc6Summary = {
    packages: packageIds.size,
    activities: new Set(selected.map(entry => entry.activity.id)).size,
    visits: totals.visits,
    completed: totals.completed,
    skipped: totals.skipped,
    rated: totals.rated,
    rating: average(totals),
    abandonment: percent(totals.skipped, totals.visits),
    requesters: new Set(requesters.map(row => row.tourist_id)).size,
    requests: requestEntries.length,
  };

  return {
    scatter,
    package_chart: packageChart,
    effort_summary: effortSummary,
    abandonment,
    requesters,
    trend: trendOf(scatter),
    summary,
  };
}

export const reportRoutes: MockRoute[] = [
  {
    method: "GET",
    path: "/reports/rc6",
    handler: ({ userId, query }) => {
      checkCanReport(userId);
      return rc6Report(query);
    },
  },
];

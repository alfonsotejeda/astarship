import { ApiError } from "@/lib/api/client";
import type { Rc1ChartPoint, Rc1Report, Rc1Row, Rc2ChartPoint, Rc2Report, Rc2Row, Rc2Summary, Rc3ChartPoint, Rc3Report, Rc3Reviewer, Rc3Row, Rc3Summary, Rc4ChartPoint, Rc4Group, Rc4Itinerary, Rc4Report, Rc4Row, Rc4Summary, Rc5EffortChartPoint, Rc5Report, Rc5Row, Rc5Summary, Rc5TypeChartPoint, Rc5TypeValue } from "@/lib/api/reports";
import { toActivityType } from "@/lib/api/activities";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import type { CriterionKey } from "@/lib/api/itineraries";
import { activityTypes, categories } from "../data/catalogs";
import { itineraries, reviews } from "../data/itineraries";
import { findUser } from "../data/users";
import type { MockRoute } from "../types";
import { findActivityRecord } from "../data/activities";
import { findPackage } from "../data/packages";
import type { ActivityRecord } from "../data/activities";
import { assignments, visits } from "../data/assignments";
import type { AssignmentRecord } from "../data/assignments";
import { memberships, travelGroups } from "../data/groups";
import type { ItineraryRecord } from "../data/itineraries";
import type { PackageRecord } from "../data/packages";
import { activityCount, effortCounts, packageOf } from "./itineraries";

// The records keep the type proportion as Visita / Excursión / Taller
const PROPORTION_CODES = ["visita", "excursion", "taller"];

// Same as the backend: every role but the tourist
function checkCanReport(userId: number) {
  if (findUser(userId)?.role === "tourist") throw new ApiError(403, "Los turistas no tienen acceso a los reportes.");
}

function rc1Report(query: URLSearchParams): Rc1Report {
  const packageId = query.get("package_id");
  const from = query.get("date_from");
  const to = query.get("date_to");

  const rows = itineraries
    .map((record): Rc1Row => {
      const pkg = packageOf(record);
      return {
        id: record.id,
        package_id: pkg.id,
        package_name: pkg.name,
        guide_id: record.guide_id,
        creator: findUser(record.guide_id)?.name ?? "",
        creation_date: record.generated_at.slice(0, 10),
        status: record.status,
        activity_count: activityCount(record),
        proportion_types: record.proportion.map((value, index) => ({
          activity_type_code: PROPORTION_CODES[index],
          activity_type_name: activityTypes.find(type => type.code === PROPORTION_CODES[index])?.name ?? "",
          value,
        })),
        proportion_categories: [],
      };
    })
    .filter(
      row =>
        (!packageId || row.package_id === Number(packageId)) &&
        (!from || row.creation_date >= from) &&
        (!to || row.creation_date <= to),
    )
    .sort((a, b) => b.creation_date.localeCompare(a.creation_date) || a.id - b.id);

  const counts = new Map<string, Rc1ChartPoint>();
  for (const row of rows) {
    const key = `${row.guide_id}-${row.status}`;
    const point = counts.get(key) ?? { guide_id: row.guide_id, creator: row.creator, status: row.status, count: 0 };
    counts.set(key, { ...point, count: point.count + 1 });
  }

  return { rows, chart: [...counts.values()] };
}

function effortBand(level: number): Rc2Row["effort"] {
  if (level <= 1) return "bajo";
  if (level === 2) return "medio";
  return "alto";
}

function chartTotal(point: Rc2ChartPoint) {
  return point.bajo + point.medio + point.alto;
}

function rc2Report(query: URLSearchParams): Rc2Report {
  const packageId = query.get("package_id");
  const from = query.get("date_from");
  const to = query.get("date_to");

  // Only the approved itineraries are final (RC-2)
  const finals = itineraries.filter(record => {
    const created = record.generated_at.slice(0, 10);
    return (
      record.status === "approved" &&
      (!packageId || record.package_id === Number(packageId)) &&
      (!from || created >= from) &&
      (!to || created <= to)
    );
  });

  const uses = new Map<number, number>();
  for (const record of finals) {
    for (const day of record.days) {
      for (const [activityId] of day.stops) {
        uses.set(activityId, (uses.get(activityId) ?? 0) + 1);
      }
    }
  }

  const totalUses = [...uses.values()].reduce((sum, value) => sum + value, 0);

  const rows = [...uses.entries()]
    .flatMap(([activityId, count]): Rc2Row[] => {
      const record = findActivityRecord(activityId);
      const type = toActivityType(record?.activity_type_code ?? null);
      if (!record || !type) return [];

      return [
        {
          activity_id: record.id,
          activity_name: record.name,
          category_id: record.category_id,
          category_name: categories.find(category => category.id === record.category_id)?.name ?? "",
          activity_type_code: type,
          activity_type_name: activityTypes.find(item => item.code === type)?.name ?? "",
          effort: effortBand(record.effort_level),
          uses: count,
          percentage: totalUses > 0 ? (count / totalUses) * 100 : 0,
        },
      ];
    })
    .sort((a, b) => b.uses - a.uses || a.activity_name.localeCompare(b.activity_name, "es"));

  // One bar per category, stacked by effort level
  const byCategory = new Map<number, Rc2ChartPoint>();
  for (const row of rows) {
    const point =
      byCategory.get(row.category_id) ??
      ({ category_id: row.category_id, category: row.category_name, bajo: 0, medio: 0, alto: 0 } satisfies Rc2ChartPoint);
    point[row.effort] += row.uses;
    byCategory.set(row.category_id, point);
  }

  const chart = [...byCategory.values()].sort(
    (a, b) => chartTotal(b) - chartTotal(a) || a.category.localeCompare(b.category, "es"),
  );

  const summary: Rc2Summary = {
    final_itineraries: finals.length,
    distinct_activities: rows.length,
    total_uses: totalUses,
    high_effort_uses: rows.filter(row => row.effort === "alto").reduce((sum, row) => sum + row.uses, 0),
  };

  return { rows, chart, summary };
}

// Mock for GET /reports/rc3 until backend #57 exists. It reuses the demo reviews.
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function monthLabel(month: string) {
  const [year, value] = month.split("-");
  return `${MONTHS[Number(value) - 1]} ${year}`;
}

function reviewerOptions(): Rc3Reviewer[] {
  return [...new Set(reviews.map(review => review.reviewer_id))]
    .flatMap((id): Rc3Reviewer[] => {
      const user = findUser(id);
      return user ? [{ id, name: user.name }] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function rc3Report(query: URLSearchParams): Rc3Report {
  const reviewer = query.get("reviewer_id");
  const from = query.get("date_from");
  const to = query.get("date_to");

  const visible = reviews.filter(
    review =>
      (!reviewer || review.reviewer_id === Number(reviewer)) &&
      (!from || review.review_date >= from) &&
      (!to || review.review_date <= to),
  );

  const rows = visible
    .flatMap((review): Rc3Row[] => {
      const itinerary = itineraries.find(item => item.id === review.itinerary_id);
      if (!itinerary) return [];

      return [
        {
          key: `${review.itinerary_id}-${review.reviewer_id}-${review.review_date}-${review.result}`,
          itinerary_id: review.itinerary_id,
          package_name: findPackage(itinerary.package_id)?.name ?? "",
          guide_name: findUser(itinerary.guide_id)?.name ?? "",
          reviewer_id: review.reviewer_id,
          reviewer_name: findUser(review.reviewer_id)?.name ?? "",
          review_date: review.review_date,
          result: review.result,
          observations: review.observations,
        },
      ];
    })
    .sort((a, b) => b.review_date.localeCompare(a.review_date) || b.itinerary_id - a.itinerary_id);

  // One bar per month, split by the result of each review
  const byMonth = new Map<string, Rc3ChartPoint>();
  for (const row of rows) {
    if (row.result === "pending") continue;

    const month = row.review_date.slice(0, 7);
    const point =
      byMonth.get(month) ??
      ({ month, label: monthLabel(month), approved: 0, returned: 0, validated: 0 } satisfies Rc3ChartPoint);

    if (row.result === "approved") point.approved += 1;
    else if (row.result === "rejected") point.returned += 1;
    else point.validated += 1;
    byMonth.set(month, point);
  }

  const summary: Rc3Summary = {
    validations: rows.length,
    approved: rows.filter(row => row.result === "approved").length,
    returned: rows.filter(row => row.result === "rejected").length,
    itineraries: new Set(rows.map(row => row.itinerary_id)).size,
  };

  return {
    rows,
    chart: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)),
    summary,
    reviewers: reviewerOptions(),
  };
}

// Mock for GET /reports/rc4 until backend #58 exists. It reuses the demo visits.
const EFFORT_LEVELS: EffortLevel[] = ["bajo", "medio", "alto"];
const EFFORT_ORDER: Record<EffortLevel, number> = { bajo: 1, medio: 2, alto: 3 };
const EFFORT_LABEL: Record<EffortLevel, string> = { bajo: "Bajo", medio: "Medio", alto: "Alto" };

// A tourist may belong to several groups; only those of the itinerary's package apply
function groupIdsFor(userId: number, packageId: number) {
  return memberships
    .filter(item => item.tourist_id === userId)
    .flatMap(item => {
      const group = travelGroups.find(record => record.id === item.travel_group_id);
      return group && group.package_id === packageId ? [group.id] : [];
    });
}

type Experience = {
  assignment: AssignmentRecord;
  itinerary: ItineraryRecord;
  groupIds: number[];
};

function allExperiences(): Experience[] {
  return assignments.flatMap(assignment => {
    const itinerary = itineraries.find(item => item.id === assignment.itinerary_id);
    if (!itinerary) return [];
    return [{ assignment, itinerary, groupIds: groupIdsFor(assignment.user_id, itinerary.package_id) }];
  });
}

function itineraryOptions(): Rc4Itinerary[] {
  const ids = new Set(visits.map(visit => visit.itinerary_id));
  return [...ids]
    .flatMap((id): Rc4Itinerary[] => {
      const itinerary = itineraries.find(item => item.id === id);
      if (!itinerary) return [];
      return [{ id, package_name: findPackage(itinerary.package_id)?.name ?? "" }];
    })
    .sort((a, b) => b.id - a.id);
}

function groupOptions(experiences: Experience[]): Rc4Group[] {
  const ids = new Set(experiences.flatMap(experience => experience.groupIds));
  return travelGroups
    .filter(group => ids.has(group.id))
    .map(group => ({ id: group.id, name: group.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

type ActivityAccumulator = {
  activity: ActivityRecord;
  visits: number;
  completed: number;
  skipped: number;
  rated: number;
  satisfied: number;
  ratingSum: number;
};

function emptyAccumulator(activity: ActivityRecord): ActivityAccumulator {
  return { activity, visits: 0, completed: 0, skipped: 0, rated: 0, satisfied: 0, ratingSum: 0 };
}

function total(accumulators: ActivityAccumulator[]) {
  return accumulators.reduce(
    (sum, item) => ({
      visits: sum.visits + item.visits,
      completed: sum.completed + item.completed,
      skipped: sum.skipped + item.skipped,
      rated: sum.rated + item.rated,
      satisfied: sum.satisfied + item.satisfied,
      ratingSum: sum.ratingSum + item.ratingSum,
    }),
    { visits: 0, completed: 0, skipped: 0, rated: 0, satisfied: 0, ratingSum: 0 },
  );
}

function percent(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

function rc4Report(query: URLSearchParams): Rc4Report {
  const itineraryId = query.get("itinerary_id");
  const groupId = query.get("group_id");
  const experiences = allExperiences();
  const visible = experiences.filter(
    experience =>
      (!itineraryId || experience.itinerary.id === Number(itineraryId)) &&
      (!groupId || experience.groupIds.includes(Number(groupId))),
  );

  const tourists = new Set<number>();
  const byActivity = new Map<number, ActivityAccumulator>();

  for (const experience of visible) {
    const ownVisits = visits.filter(
      visit =>
        visit.itinerary_id === experience.itinerary.id && visit.user_id === experience.assignment.user_id,
    );
    if (ownVisits.length > 0) tourists.add(experience.assignment.user_id);

    for (const visit of ownVisits) {
      const activity = findActivityRecord(visit.activity_id);
      if (!activity) continue;

      const accumulator = byActivity.get(activity.id) ?? emptyAccumulator(activity);
      accumulator.visits += 1;

      if (visit.status === "done") {
        accumulator.completed += 1;
        if (visit.rating !== null) {
          accumulator.rated += 1;
          accumulator.ratingSum += visit.rating;
          if (visit.rating >= 4) accumulator.satisfied += 1;
        }
      } else {
        accumulator.skipped += 1;
      }

      byActivity.set(activity.id, accumulator);
    }
  }

  const accumulators = [...byActivity.values()];
  const rows = accumulators
    .map(
      (item): Rc4Row => ({
        id: item.activity.id,
        activity_name: item.activity.name,
        effort: effortBand(item.activity.effort_level),
        visits: item.visits,
        completed: item.completed,
        rating: item.rated > 0 ? item.ratingSum / item.rated : null,
        satisfaction: percent(item.satisfied, item.visits),
        abandonment: percent(item.skipped, item.visits),
      }),
    )
    .sort(
      (a, b) =>
        EFFORT_ORDER[a.effort] - EFFORT_ORDER[b.effort] ||
        b.visits - a.visits ||
        a.activity_name.localeCompare(b.activity_name, "es"),
    );

  const chart = EFFORT_LEVELS.map((effort): Rc4ChartPoint => {
    const totals = total(accumulators.filter(item => effortBand(item.activity.effort_level) === effort));
    return {
      effort,
      label: EFFORT_LABEL[effort],
      satisfaction: percent(totals.satisfied, totals.visits),
      abandonment: percent(totals.skipped, totals.visits),
    };
  });

  const totals = total(accumulators);
  const summary: Rc4Summary = {
    visits: totals.visits,
    completed: totals.completed,
    skipped: totals.skipped,
    rated: totals.rated,
    tourists: tourists.size,
    rating: totals.rated > 0 ? totals.ratingSum / totals.rated : null,
    satisfaction: percent(totals.satisfied, totals.visits),
    abandonment: percent(totals.skipped, totals.visits),
  };

  return {
    rows,
    chart,
    summary,
    itineraries: itineraryOptions(),
    groups: groupOptions(experiences),
  };
}

// Mock for GET /reports/rc5 until backend #59 exists. It compares the demo itineraries.
const CRITERIA: CriterionKey[] = ["type_proportion", "category_coverage", "activity_count", "late_high_effort"];
const TYPE_CODES = ["visita", "excursion", "taller"] as const;
type TypeCode = (typeof TYPE_CODES)[number];

function isTypeCode(code: string): code is TypeCode {
  return TYPE_CODES.includes(code as TypeCode);
}

function typeCounts(record: ItineraryRecord) {
  const counts: Record<TypeCode, number> = { visita: 0, excursion: 0, taller: 0 };
  for (const day of record.days) {
    for (const [activityId] of day.stops) {
      const activity = findActivityRecord(activityId);
      if (activity && isTypeCode(activity.activity_type_code)) counts[activity.activity_type_code] += 1;
    }
  }
  return counts;
}

// The three shares add up to 100 even when rounding each one separately would not
function percentages(counts: Record<TypeCode, number>) {
  const total = counts.visita + counts.excursion + counts.taller;
  if (total === 0) return [0, 0, 0];

  const visita = Math.round((counts.visita / total) * 100);
  const excursion = Math.round((counts.excursion / total) * 100);
  return [visita, excursion, Math.max(0, 100 - visita - excursion)];
}

// The failed criterion records what was actually covered; otherwise the package's categories are met
function coverageOf(record: ItineraryRecord, pkg: PackageRecord) {
  const actual = record.failed?.category_coverage?.actual ?? "";
  const match = /^(\d+)\s+de\s+(\d+)/.exec(actual);
  if (match) return { covered: Number(match[1]), total: Number(match[2]) };
  return { covered: pkg.category_ids.length, total: pkg.category_ids.length };
}

// «Conjunto»: every itinerary, one review status, or only the assigned ones
function matchesSet(record: ItineraryRecord, set: string) {
  if (set === "") return true;
  if (set === "assigned") return record.assigned;
  return record.status === set;
}

function rc5Report(query: URLSearchParams): Rc5Report {
  const set = query.get("set") ?? "";
  const from = query.get("date_from");
  const to = query.get("date_to");

  const visible = itineraries
    .filter(record => {
      const date = record.generated_at.slice(0, 10);
      return matchesSet(record, set) && (!from || date >= from) && (!to || date <= to);
    })
    .sort((a, b) => packageOf(a).name.localeCompare(packageOf(b).name, "es") || a.id - b.id);

  const typeChart = new Map<number, Rc5TypeChartPoint>();
  const effortChart = new Map<number, Rc5EffortChartPoint>();

  const rows = visible.map((record): Rc5Row => {
    const pkg = packageOf(record);
    const counts = typeCounts(record);
    const effort = effortCounts(record);
    const coverage = coverageOf(record, pkg);
    const failedCount = CRITERIA.filter(key => record.failed?.[key] !== undefined).length;

    const activityTypesValue: Rc5TypeValue[] = activityTypes.map(type => ({
      activity_type_code: type.code,
      activity_type_name: type.name,
      count: isTypeCode(type.code) ? counts[type.code] : 0,
    }));

    const typePoint = typeChart.get(pkg.id) ?? { package_id: pkg.id, package_name: pkg.name, visita: 0, excursion: 0, taller: 0 };
    typeChart.set(pkg.id, {
      ...typePoint,
      visita: typePoint.visita + counts.visita,
      excursion: typePoint.excursion + counts.excursion,
      taller: typePoint.taller + counts.taller,
    });

    const effortPoint = effortChart.get(pkg.id) ?? { package_id: pkg.id, package_name: pkg.name, bajo: 0, medio: 0, alto: 0 };
    effortChart.set(pkg.id, {
      ...effortPoint,
      bajo: effortPoint.bajo + effort.low,
      medio: effortPoint.medio + effort.medium,
      alto: effortPoint.alto + effort.high,
    });

    return {
      id: record.id,
      package_id: pkg.id,
      package_name: pkg.name,
      creation_date: record.generated_at.slice(0, 10),
      status: record.status,
      assigned: record.assigned,
      activity_count: activityCount(record),
      activity_types: activityTypesValue,
      proportion: percentages(counts),
      covered_categories: coverage.covered,
      package_categories: coverage.total,
      high_effort: effort.high,
      criteria_met: CRITERIA.length - failedCount,
      criteria_total: CRITERIA.length,
      balanced: failedCount === 0,
    };
  });

  const summary: Rc5Summary = {
    itineraries: rows.length,
    packages: new Set(rows.map(row => row.package_id)).size,
    activities: rows.reduce((sum, row) => sum + row.activity_count, 0),
    balanced: rows.filter(row => row.balanced).length,
    unbalanced: rows.filter(row => !row.balanced).length,
    high_effort: rows.reduce((sum, row) => sum + row.high_effort, 0),
  };

  const byName = (a: { package_name: string }, b: { package_name: string }) =>
    a.package_name.localeCompare(b.package_name, "es");

  return {
    rows,
    type_chart: [...typeChart.values()].sort(byName),
    effort_chart: [...effortChart.values()].sort(byName),
    summary,
  };
}

export const reportRoutes: MockRoute[] = [
  {
    method: "GET",
    path: "/reports/rc1",
    handler: ({ userId, query }) => {
      checkCanReport(userId);
      return rc1Report(query);
    },
  },
  {
    method: "GET",
    path: "/reports/rc2",
    handler: ({ userId, query }) => {
      checkCanReport(userId);
      return rc2Report(query);
    },
  },
  {
    method: "GET",
    path: "/reports/rc3",
    handler: ({ userId, query }) => {
      checkCanReport(userId);
      return rc3Report(query);
    },
  },
  {
    method: "GET",
    path: "/reports/rc4",
    handler: ({ userId, query }) => {
      checkCanReport(userId);
      return rc4Report(query);
    },
  },
  {
    method: "GET",
    path: "/reports/rc5",
    handler: ({ userId, query }) => {
      checkCanReport(userId);
      return rc5Report(query);
    },
  },
];

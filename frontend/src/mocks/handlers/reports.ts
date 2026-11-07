import { ApiError } from "@/lib/api/client";
import type { Rc1ChartPoint, Rc1Report, Rc1Row, Rc2ChartPoint, Rc2Report, Rc2Row, Rc2Summary, Rc3ChartPoint, Rc3Report, Rc3Reviewer, Rc3Row, Rc3Summary } from "@/lib/api/reports";
import { toActivityType } from "@/lib/api/activities";
import { activityTypes, categories } from "../data/catalogs";
import { itineraries, reviews } from "../data/itineraries";
import { findUser } from "../data/users";
import type { MockRoute } from "../types";
import { findActivityRecord } from "../data/activities";
import { findPackage } from "../data/packages";
import { activityCount, packageOf } from "./itineraries";

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
];

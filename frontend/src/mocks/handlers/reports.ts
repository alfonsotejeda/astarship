import { ApiError } from "@/lib/api/client";
import type { Rc3ChartPoint, Rc3Report, Rc3Reviewer, Rc3Row, Rc3Summary } from "@/lib/api/reports";
import { itineraries, reviews } from "../data/itineraries";
import { findPackage } from "../data/packages";
import { findUser } from "../data/users";
import type { MockRoute } from "../types";

// Mock for GET /reports/rc3 until backend #57 exists. It reuses the demo reviews.
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Same as the backend: every role but the tourist
function checkCanReport(userId: number) {
  if (findUser(userId)?.role === "tourist") throw new ApiError(403, "Los turistas no tienen acceso a los reportes.");
}

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
    path: "/reports/rc3",
    handler: ({ userId, query }) => {
      checkCanReport(userId);
      return rc3Report(query);
    },
  },
];

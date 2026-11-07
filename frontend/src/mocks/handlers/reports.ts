import { ApiError } from "@/lib/api/client";
import type { Rc1ChartPoint, Rc1Report, Rc1Row } from "@/lib/api/reports";
import { activityTypes } from "../data/catalogs";
import { itineraries } from "../data/itineraries";
import { findUser } from "../data/users";
import type { MockRoute } from "../types";
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

export const reportRoutes: MockRoute[] = [
  {
    method: "GET",
    path: "/reports/rc1",
    handler: ({ userId, query }) => {
      checkCanReport(userId);
      return rc1Report(query);
    },
  },
];

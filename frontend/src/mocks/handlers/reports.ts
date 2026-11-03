import { ApiError } from "@/lib/api/client";
import type { CriterionKey } from "@/lib/api/itineraries";
import type {
  Rc5EffortChartPoint,
  Rc5Report,
  Rc5Row,
  Rc5Summary,
  Rc5TypeChartPoint,
  Rc5TypeValue,
} from "@/lib/api/reports";
import { findActivityRecord } from "../data/activities";
import { activityTypes } from "../data/catalogs";
import { itineraries } from "../data/itineraries";
import type { ItineraryRecord } from "../data/itineraries";
import type { PackageRecord } from "../data/packages";
import { findUser } from "../data/users";
import type { MockRoute } from "../types";
import { activityCount, effortCounts, packageOf } from "./itineraries";

// Mock for GET /reports/rc5 until backend #59 exists. It compares the demo itineraries.
const CRITERIA: CriterionKey[] = ["type_proportion", "category_coverage", "activity_count", "late_high_effort"];
const TYPE_CODES = ["visita", "excursion", "taller"] as const;
type TypeCode = (typeof TYPE_CODES)[number];

// Same as the backend: every role but the tourist
function checkCanReport(userId: number) {
  if (findUser(userId)?.role === "tourist") throw new ApiError(403, "Los turistas no tienen acceso a los reportes.");
}

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
    path: "/reports/rc5",
    handler: ({ userId, query }) => {
      checkCanReport(userId);
      return rc5Report(query);
    },
  },
];

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ItineraryStatus } from "./itineraries";
import { request } from "./client";

// RC-5: activities of an itinerary grouped by type, with the package's distribution
export interface Rc5TypeValue {
  activity_type_code: string;
  activity_type_name: string;
  count: number;
}

// One bar per package, stacked by activity type
export interface Rc5TypeChartPoint {
  package_id: number;
  package_name: string;
  visita: number;
  excursion: number;
  taller: number;
}

// One bar per package, stacked by effort level
export interface Rc5EffortChartPoint {
  package_id: number;
  package_name: string;
  bajo: number;
  medio: number;
  alto: number;
}

// RC-5: an itinerary compared against its package's balance criteria
export interface Rc5Row {
  // The itinerary id; also the table row key
  id: number;
  package_id: number;
  package_name: string;
  creation_date: string;
  status: ItineraryStatus;
  assigned: boolean;
  activity_count: number;
  // Actual distribution by type, in the activity type order (Visita / Excursión / Taller)
  activity_types: Rc5TypeValue[];
  // The same distribution as percentages, ready for the «Reparto» column
  proportion: number[];
  covered_categories: number;
  package_categories: number;
  high_effort: number;
  criteria_met: number;
  criteria_total: number;
  balanced: boolean;
}

export interface Rc5Summary {
  itineraries: number;
  packages: number;
  activities: number;
  balanced: number;
  unbalanced: number;
  high_effort: number;
}

export interface Rc5Report {
  rows: Rc5Row[];
  type_chart: Rc5TypeChartPoint[];
  effort_chart: Rc5EffortChartPoint[];
  summary: Rc5Summary;
}

export type Rc5Set = "" | "approved" | "assigned" | "validated" | "pending" | "rejected";

export interface Rc5Filters {
  // «Conjunto»: which itineraries of the period are compared
  set: Rc5Set;
  date_from: string;
  date_to: string;
}

// Empty filters are left out, so the API reports every itinerary and date
function query(filters: object) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ""));
  const search = params.toString();
  return search ? `?${search}` : "";
}

export function getRc5Report(filters: Rc5Filters) {
  return request<Rc5Report>(`/reports/rc5${query(filters)}`);
}

// The previous result stays on screen while a filter change loads
export function useRc5Report(filters: Rc5Filters) {
  return useQuery({
    queryKey: ["reports", "rc5", filters],
    queryFn: () => getRc5Report(filters),
    placeholderData: keepPreviousData,
  });
}

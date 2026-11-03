import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ActivityType } from "@/components/Badge/Badge";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import { request } from "./client";

// RC-2: an activity used in the final itineraries of a package
export interface Rc2Row {
  activity_id: number;
  activity_name: string;
  category_id: number;
  category_name: string;
  activity_type_code: ActivityType;
  activity_type_name: string;
  effort: EffortLevel;
  uses: number;
  // Share of all the uses in the report
  percentage: number;
}

// One point per category, stacked by effort level
export interface Rc2ChartPoint {
  category_id: number;
  category: string;
  bajo: number;
  medio: number;
  alto: number;
}

export interface Rc2Summary {
  final_itineraries: number;
  distinct_activities: number;
  total_uses: number;
  high_effort_uses: number;
}

export interface Rc2Report {
  rows: Rc2Row[];
  chart: Rc2ChartPoint[];
  summary: Rc2Summary;
}

export interface Rc2Filters {
  package_id: string;
  date_from: string;
  date_to: string;
}

// Empty filters are left out, so the API reports every package and date
function query(filters: object) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ""));
  const search = params.toString();
  return search ? `?${search}` : "";
}

export function getRc2Report(filters: Rc2Filters) {
  return request<Rc2Report>(`/reports/rc2${query(filters)}`);
}

// The previous result stays on screen while a filter change loads
export function useRc2Report(filters: Rc2Filters) {
  return useQuery({
    queryKey: ["reports", "rc2", filters],
    queryFn: () => getRc2Report(filters),
    placeholderData: keepPreviousData,
  });
}

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import { request } from "./client";

// RC-6: a package at one effort level, as a point of the effort ↔ rating dispersion
export interface Rc6ScatterPoint {
  package_id: number;
  package_name: string;
  effort: EffortLevel;
  // 1 low, 2 medium, 3 high; the x axis of the dispersion
  effort_value: number;
  // Mean rating of the completed visits at that effort level
  rating: number;
  // Every visit at that effort level, whether completed or skipped
  visits: number;
  // Visits with a rating, the ones behind the mean
  rated: number;
}

// Linear trend of the dispersion, ready for ChartPanel
export interface Rc6Trend {
  slope: number;
  intercept: number;
  // Pearson coefficient; null when every point shares the same effort
  correlation: number | null;
  from: [number, number];
  to: [number, number];
}

// RC-6: average rating of a package at each effort level
export interface Rc6PackagePoint {
  package_id: number;
  package_name: string;
  bajo: number | null;
  medio: number | null;
  alto: number | null;
}

export interface Rc6EffortSummary {
  effort: EffortLevel;
  label: string;
  visits: number;
  rated: number;
  rating: number | null;
  // Share of visits the tourists skipped
  abandonment: number;
}

// RC-6: an activity with its abandonment rate, creator and package
export interface Rc6AbandonmentRow {
  // Activity and package, so an activity shared by two packages gets one row each
  id: string;
  activity_id: number;
  activity_name: string;
  effort: EffortLevel;
  package_id: number;
  package_name: string;
  guide_id: number;
  guide_name: string;
  visits: number;
  completed: number;
  skipped: number;
  // Share of visits the tourists skipped
  abandonment: number;
  rating: number | null;
}

// RC-6: a tourist who asked for a modification vs their travel group in the same package
export interface Rc6RequesterRow {
  // Tourist, group and package, so a tourist in several groups gets one row each
  id: string;
  tourist_id: number;
  tourist_name: string;
  group_id: number;
  group_name: string;
  package_id: number;
  package_name: string;
  requests: number;
  visits: number;
  rated: number;
  // The requester's average rating in that package
  rating: number | null;
  // The travel group's average rating in that package
  group_rating: number | null;
  // rating - group_rating, when both exist
  difference: number | null;
}

export interface Rc6Summary {
  packages: number;
  activities: number;
  visits: number;
  completed: number;
  skipped: number;
  rated: number;
  rating: number | null;
  abandonment: number;
  requesters: number;
  requests: number;
}

export interface Rc6Report {
  scatter: Rc6ScatterPoint[];
  package_chart: Rc6PackagePoint[];
  effort_summary: Rc6EffortSummary[];
  abandonment: Rc6AbandonmentRow[];
  requesters: Rc6RequesterRow[];
  trend: Rc6Trend | null;
  summary: Rc6Summary;
}

export interface Rc6Filters {
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

export function getRc6Report(filters: Rc6Filters) {
  return request<Rc6Report>(`/reports/rc6${query(filters)}`);
}

// The previous result stays on screen while a filter change loads
export function useRc6Report(filters: Rc6Filters) {
  return useQuery({
    queryKey: ["reports", "rc6", filters],
    queryFn: () => getRc6Report(filters),
    placeholderData: keepPreviousData,
  });
}

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import { request } from "./client";

// RC-4: one activity of an itinerary, with the experience of the tourists who visited it
export interface Rc4Row {
  // The activity id; also the table row key
  id: number;
  activity_name: string;
  effort: EffortLevel;
  // Every visit record, whether the tourist completed it or skipped it
  visits: number;
  completed: number;
  // Mean of the ratings of the completed visits; null when nobody rated it
  rating: number | null;
  // Share of visits with a rating of 4 or more
  satisfaction: number;
  // Share of visits the tourists skipped
  abandonment: number;
}

// One bar group per effort level, with the two experience rates
export interface Rc4ChartPoint {
  effort: EffortLevel;
  label: string;
  satisfaction: number;
  abandonment: number;
}

export interface Rc4Summary {
  visits: number;
  completed: number;
  skipped: number;
  rated: number;
  tourists: number;
  rating: number | null;
  satisfaction: number;
  abandonment: number;
}

export interface Rc4Itinerary {
  id: number;
  package_name: string;
}

export interface Rc4Group {
  id: number;
  name: string;
}

export interface Rc4Report {
  rows: Rc4Row[];
  chart: Rc4ChartPoint[];
  summary: Rc4Summary;
  itineraries: Rc4Itinerary[];
  groups: Rc4Group[];
}

export interface Rc4Filters {
  itinerary_id: string;
  group_id: string;
}

// Empty filters are left out, so the API reports every itinerary and group
function query(filters: object) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ""));
  const search = params.toString();
  return search ? `?${search}` : "";
}

export function getRc4Report(filters: Rc4Filters) {
  return request<Rc4Report>(`/reports/rc4${query(filters)}`);
}

// The previous result stays on screen while a filter change loads
export function useRc4Report(filters: Rc4Filters) {
  return useQuery({
    queryKey: ["reports", "rc4", filters],
    queryFn: () => getRc4Report(filters),
    placeholderData: keepPreviousData,
  });
}

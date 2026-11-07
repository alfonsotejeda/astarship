import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { request } from "./client";
import type { ItineraryStatus } from "./itineraries";

export interface Rc1TypeParam {
  activity_type_code: string;
  activity_type_name: string;
  value: number;
}

export interface Rc1CategoryParam {
  category_id: number;
  category_name: string;
  value: number;
}

// RC-1: a generated itinerary with its creator, creation date and generation parameters
export interface Rc1Row {
  id: number;
  package_id: number;
  package_name: string;
  guide_id: number;
  creator: string;
  creation_date: string;
  status: ItineraryStatus;
  activity_count: number;
  proportion_types: Rc1TypeParam[];
  proportion_categories: Rc1CategoryParam[];
}

export interface Rc1ChartPoint {
  guide_id: number;
  creator: string;
  status: ItineraryStatus;
  count: number;
}

export interface Rc1Report {
  rows: Rc1Row[];
  chart: Rc1ChartPoint[];
}

export interface Rc1Filters {
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

export function getRc1Report(filters: Rc1Filters) {
  return request<Rc1Report>(`/reports/rc1${query(filters)}`);
}

// The previous result stays on screen while a filter change loads
export function useRc1Report(filters: Rc1Filters) {
  return useQuery({
    queryKey: ["reports", "rc1", filters],
    queryFn: () => getRc1Report(filters),
    placeholderData: keepPreviousData,
  });
}

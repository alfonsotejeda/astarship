import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ItineraryStatus } from "./itineraries";
import { request } from "./client";

// RC-3: one review of an itinerary, made by a guide or the operations manager
export interface Rc3Row {
  // Unique per itinerary, reviewer, date and result
  key: string;
  itinerary_id: number;
  package_name: string;
  guide_name: string;
  reviewer_id: number;
  reviewer_name: string;
  review_date: string;
  result: ItineraryStatus;
  observations: string | null;
}

// One point per month, grouped by the review result
export interface Rc3ChartPoint {
  // YYYY-MM, used to keep the months in order
  month: string;
  label: string;
  approved: number;
  returned: number;
  // Guide validations; zero when the reviewer only approves or returns
  validated: number;
}

export interface Rc3Summary {
  validations: number;
  approved: number;
  returned: number;
  itineraries: number;
}

export interface Rc3Reviewer {
  id: number;
  name: string;
}

export interface Rc3Report {
  rows: Rc3Row[];
  chart: Rc3ChartPoint[];
  summary: Rc3Summary;
  reviewers: Rc3Reviewer[];
}

export interface Rc3Filters {
  reviewer_id: string;
  date_from: string;
  date_to: string;
}

// Empty filters are left out, so the API reports every reviewer and date
function query(filters: object) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ""));
  const search = params.toString();
  return search ? `?${search}` : "";
}

export function getRc3Report(filters: Rc3Filters) {
  return request<Rc3Report>(`/reports/rc3${query(filters)}`);
}

// The previous result stays on screen while a filter change loads
export function useRc3Report(filters: Rc3Filters) {
  return useQuery({
    queryKey: ["reports", "rc3", filters],
    queryFn: () => getRc3Report(filters),
    placeholderData: keepPreviousData,
  });
}

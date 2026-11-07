import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ActivityType } from "@/components/Badge/Badge";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
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

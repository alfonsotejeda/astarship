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

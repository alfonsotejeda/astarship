import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "./client";

// Two reviews: a guide with CanValidate validates (pending → validated), the manager approves or rejects
export type ItineraryStatus = "pending" | "validated" | "approved" | "rejected";

// What the current user may do with an itinerary; the API applies RN-07 and RN-10
export type ReviewAction = "validate" | "approve";

export type ReviewDecision = "approve" | "reject" | "redo";

export type CriterionKey = "type_proportion" | "category_coverage" | "activity_count" | "late_high_effort";

export interface ProportionType {
  activity_type_code: string;
  value: number;
}

export interface EffortCounts {
  low: number;
  medium: number;
  high: number;
}

export interface ItinerarySummary {
  id: number;
  status: ItineraryStatus;
  assigned: boolean;
  creation_date: string;
  submitted_date: string | null;
  package_id: number;
  package_name: string;
  guide_id: number;
  guide_name: string;
  is_mine: boolean;
  review: ReviewAction | null;
  days: number;
  activity_count: number;
  effort: EffortCounts;
  proportion_types: ProportionType[];
  criteria_met: number;
  criteria_total: number;
}

export interface ItineraryStop {
  activity_id: number;
  order: number;
  start_time: string;
  activity_name: string;
  attraction_name: string | null;
  activity_type_code: string | null;
  effort_level: number;
  duration_minutes: number;
}

export interface ItineraryDay {
  day: number;
  date: string;
  stops: ItineraryStop[];
}

export interface ItineraryCriterion {
  key: CriterionKey;
  target: string;
  actual: string;
  ok: boolean;
  detail?: string;
}

export interface DiscardedActivity {
  activity_id: number;
  activity_name: string;
  reason: string;
}

// Other itineraries of the same package, with their last review
export interface PackageHistoryItem {
  itinerary_id: number;
  date: string;
  status: ItineraryStatus;
  assigned: boolean;
  observations: string | null;
}

export interface ItineraryDetail {
  id: number;
  status: ItineraryStatus;
  assigned: boolean;
  generated_at: string;
  submitted_date: string | null;
  activity_count: number;
  package_id: number;
  package_name: string;
  package_categories: string[];
  guide_id: number;
  guide_name: string;
  is_mine: boolean;
  review: ReviewAction | null;
  replaces_id: number | null;
  proportion_types: ProportionType[];
  avoid_late_high_effort: boolean;
  days: ItineraryDay[];
  criteria: ItineraryCriterion[];
  discarded: DiscardedActivity[];
  history: PackageHistoryItem[];
}

export interface ItineraryReview {
  itinerary_id: number;
  package_name: string;
  guide_name: string;
  review_date: string;
  result: ItineraryStatus;
  observations: string | null;
}

export interface GenerateItineraryRequest {
  package_id: number;
  days: number;
  activity_count: number;
  proportion_types: ProportionType[];
  category_ids: number[];
  avoid_late_high_effort: boolean;
  candidate_ids: number[];
}

export interface ReviewRequest {
  result: ReviewDecision;
  observations: string;
}

// The itineraries the current user may see (RNF-10)
export function getItineraries() {
  return request<ItinerarySummary[]>("/itineraries");
}

export function getItinerary(id: number) {
  return request<ItineraryDetail>(`/itineraries/${id}`);
}

export function getMyReviews(days: number) {
  return request<ItineraryReview[]>(`/reviews?reviewer=me&days=${days}`);
}

// Generates the itinerary and stores it as pending (#50, #51)
export function generateItinerary(body: GenerateItineraryRequest) {
  return request<ItineraryDetail>("/itineraries/generate", "POST", body);
}

export function submitItinerary(id: number) {
  return request<ItineraryDetail>(`/itineraries/${id}/submit`, "POST");
}

// The API records a validation or an approval depending on who reviews
export function reviewItinerary(id: number, body: ReviewRequest) {
  return request<ItineraryDetail>(`/itineraries/${id}/validations`, "POST", body);
}

export function useItineraries() {
  return useQuery({ queryKey: ["itineraries"], queryFn: getItineraries });
}

export function useItinerary(id: number) {
  return useQuery({ queryKey: ["itineraries", id], queryFn: () => getItinerary(id) });
}

export function useMyReviews(days: number) {
  return useQuery({ queryKey: ["reviews", "me", { days }], queryFn: () => getMyReviews(days) });
}

export function useGenerateItinerary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateItinerary,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["itineraries"] }),
  });
}

export function useSubmitItinerary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitItinerary,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["itineraries"] }),
  });
}

export function useReviewItinerary(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReviewRequest) => reviewItinerary(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
      queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}

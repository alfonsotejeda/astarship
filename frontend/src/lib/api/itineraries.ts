import { useMutation } from "@tanstack/react-query";
import { request } from "./client";

export type ItineraryStatus = "pending" | "validated" | "approved" | "rejected";

export type CriterionKey = "type_proportion" | "category_coverage" | "activity_count" | "late_high_effort";

export interface GenerateItineraryRequest {
  package_id: number;
  days: number;
  activity_count: number;
  proportion_types: { activity_type_code: string; value: number }[];
  category_ids: number[];
  avoid_late_high_effort: boolean;
  candidate_ids: number[];
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

export interface ItineraryDetail {
  id: number;
  status: ItineraryStatus;
  generated_at: string;
  submitted_date: string | null;
  activity_count: number;
  package_id: number;
  package_name: string;
  guide_id: number;
  days: ItineraryDay[];
  criteria: ItineraryCriterion[];
  discarded: DiscardedActivity[];
}

// Generates the itinerary and stores it as pending (#50, #51)
export function generateItinerary(body: GenerateItineraryRequest) {
  return request<ItineraryDetail>("/itineraries/generate", "POST", body);
}

export function submitItinerary(id: number) {
  return request<ItineraryDetail>(`/itineraries/${id}/submit`, "POST");
}

export function useGenerateItinerary() {
  return useMutation({ mutationFn: generateItinerary });
}

export function useSubmitItinerary() {
  return useMutation({ mutationFn: submitItinerary });
}

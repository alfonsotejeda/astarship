import { useQuery } from "@tanstack/react-query";
import { request } from "./client";
import type { AssignmentStatus } from "./trips";

// One rated visit (#21) of an activity in the guide's packages
export interface ActivityRating {
  // Visits have a composite key: itinerary, tourist and activity
  id: string;
  visit_date: string;
  tourist_name: string;
  package_id: number;
  package_name: string;
  itinerary_id: number;
  activity_id: number;
  activity_name: string;
  effort_level: number;
  rating: number;
  comment: string | null;
  // The activity was registered by the current guide
  is_mine: boolean;
}

export interface MyActivityRating {
  activity_id: number;
  activity_name: string;
  effort_level: number;
  rating: number;
  comment: string | null;
}

// RF-28: the tourist's ratings grouped by each package received
export interface TripRatings {
  itinerary_id: number;
  package_name: string;
  status: AssignmentStatus;
  start_date: string;
  end_date: string;
  // The trip's rating is the mean of its visits; null until the trip ends
  overall: number | null;
  activities: MyActivityRating[];
}

// The API only returns ratings of the guide's packages (RNF-10)
export function getRatings() {
  return request<ActivityRating[]>("/ratings?guide=me");
}

export function getMyRatings() {
  return request<TripRatings[]>("/me/ratings");
}

export function useRatings() {
  return useQuery({ queryKey: ["ratings", { guide: "me" }], queryFn: getRatings });
}

export function useMyRatings() {
  return useQuery({ queryKey: ["me", "ratings"], queryFn: getMyRatings });
}

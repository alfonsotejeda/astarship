import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { request } from "./client";
import type { EffortCounts, ItineraryStop } from "./itineraries";

export type AssignmentStatus = "assigned" | "in_progress" | "finished";

export type VisitStatus = "done" | "skipped";

export type TravelMode = "walk" | "taxi" | "bus";

export interface TripStop extends ItineraryStop {
  // null while the tourist has not marked it
  visit_status: VisitStatus | null;
  rating: number | null;
  // From the previous stop, by the attraction network (#49)
  travel: { minutes: number; mode: TravelMode } | null;
}

export interface TripDay {
  day: number;
  date: string;
  stops: TripStop[];
}

export interface TripGuide {
  name: string;
  phone: string | null;
  specialty: string | null;
}

// An alternative proposed for today, from the attraction network (#49)
export interface TripAlternative {
  reason: string;
  activity_name: string;
  start_time: string;
}

export interface Today {
  itinerary_id: number;
  package_name: string;
  guide: TripGuide;
  // The day of the trip that is today, 1-based
  day: number;
  days: TripDay[];
  alternative: TripAlternative | null;
}

export interface Assignment {
  itinerary_id: number;
  package_name: string;
  guide_name: string;
  status: AssignmentStatus;
  start_date: string;
  end_date: string;
  days: number;
  activity_count: number;
  effort: EffortCounts;
  rating: number | null;
}

export interface AssignmentDetail extends Assignment {
  comment: string | null;
  trip_days: TripDay[];
}

export interface VisitRequest {
  status: VisitStatus | null;
  rating: number | null;
}

export interface TripRatingRequest {
  rating: number;
  comment: string;
}

// Cached by the backend in Redis so it paints at once (RNF-01); null when there is no trip today
export function getToday() {
  return request<Today | null>("/me/today");
}

export function getMyAssignments() {
  return request<Assignment[]>("/me/assignments");
}

export function getMyAssignment(itineraryId: number) {
  return request<AssignmentDetail>(`/me/assignments/${itineraryId}`);
}

export function recordVisit(itineraryId: number, userId: number, activityId: number, body: VisitRequest) {
  return request<TripStop>(`/assignments/${itineraryId}/${userId}/visits/${activityId}`, "PUT", body);
}

export function rateTrip(itineraryId: number, userId: number, body: TripRatingRequest) {
  return request<AssignmentDetail>(`/assignments/${itineraryId}/${userId}`, "PATCH", body);
}

export function useToday() {
  return useQuery({ queryKey: ["me", "today"], queryFn: getToday, staleTime: 60_000 });
}

export function useMyAssignments() {
  return useQuery({ queryKey: ["me", "assignments"], queryFn: getMyAssignments });
}

export function useMyAssignment(itineraryId: number) {
  return useQuery({ queryKey: ["me", "assignments", itineraryId], queryFn: () => getMyAssignment(itineraryId) });
}

type VisitChange = VisitRequest & { activityId: number };

function patchDays(days: TripDay[], change: VisitChange): TripDay[] {
  return days.map(day => ({
    ...day,
    stops: day.stops.map(stop =>
      stop.activity_id === change.activityId ? { ...stop, visit_status: change.status, rating: change.rating } : stop,
    ),
  }));
}

// The change shows at once; if the API fails, the cached data is restored
async function applyOptimistic(queryClient: QueryClient, itineraryId: number, change: VisitChange) {
  const todayKey = ["me", "today"];
  const assignmentKey = ["me", "assignments", itineraryId];
  const keys = [todayKey, assignmentKey];
  await Promise.all(keys.map(queryKey => queryClient.cancelQueries({ queryKey })));

  const previous = keys.map(queryKey => [queryKey, queryClient.getQueryData(queryKey)] as const);
  queryClient.setQueryData<Today | null>(todayKey, data => data && { ...data, days: patchDays(data.days, change) });
  queryClient.setQueryData<AssignmentDetail>(
    assignmentKey,
    data => data && { ...data, trip_days: patchDays(data.trip_days, change) },
  );
  return previous;
}

export function useRecordVisit(itineraryId: number, userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ activityId, ...body }: VisitChange) => recordVisit(itineraryId, userId, activityId, body),
    onMutate: change => applyOptimistic(queryClient, itineraryId, change),
    onError: (_error, _change, previous) =>
      previous?.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useRateTrip(itineraryId: number, userId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: TripRatingRequest) => rateTrip(itineraryId, userId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActivityType } from "@/components/Badge/Badge";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import { request } from "./client";
import type { ReviewStatus } from "./packages";

export type ActivityValidationResult = "approved" | "rejected";

export interface ActivityValidation {
  reviewer_name: string;
  validation_date: string;
  result: ActivityValidationResult;
  observations: string | null;
}

export interface Activity {
  id: number;
  name: string;
  effort_level: number;
  status: ReviewStatus;
  creation_date: string;
  activity_type_code: string | null;
  category_id: number | null;
  user_id: number | null;
  attraction_id: number | null;
  // Expanded for display: Attraction, Duration and the author (pantallas.md §2)
  attraction_name: string | null;
  author_name: string | null;
  duration_minutes: number;
  // Times it appears in approved itineraries
  uses: number;
  // The administrator's last review of a new activity (#156)
  last_validation: ActivityValidation | null;
}

export interface ActivityForm {
  name: string;
  attraction_id: number;
  activity_type_code: string;
  category_id: number;
  effort_level: number;
  duration_minutes: number;
}

export interface ActivityValidationRequest {
  result: ActivityValidationResult;
  observations: string;
}

export type DuplicateStatus = "pending" | "merged" | "dismissed";

// Two activities at the same attraction with a similar name (RF-06, #54)
export interface DuplicatePair {
  id: number;
  // 0–100
  score: number;
  status: DuplicateStatus;
  a: Activity;
  b: Activity;
  kept_id: number | null;
  resolved_date: string | null;
  resolver_name: string | null;
}

const ACTIVITY_TYPES: ActivityType[] = ["visita", "excursion", "taller"];

export function toActivityType(code: string | null): ActivityType | undefined {
  return ACTIVITY_TYPES.find(type => type === code);
}

// Same scale as the reports: 1 low, 2 medium, 3 high
export function toEffortLevel(level: number): EffortLevel {
  if (level <= 1) return "bajo";
  if (level === 2) return "medio";
  return "alto";
}

// RNF-10: a guide gets the approved ones plus their own; the admin, all of them
export function getActivities() {
  return request<Activity[]>("/activities");
}

// Approved activities of the bank that can be used in the package
export function getPackageActivities(packageId: number) {
  return request<Activity[]>(`/activities?package=${packageId}&status=approved`);
}

// New activities are born pending; 409 if the same name already exists at the attraction (RN-03)
export function createActivity(form: ActivityForm) {
  return request<Activity>("/activities", "POST", form);
}

// RN-01: only the guide who described it
export function updateActivity(id: number, form: ActivityForm) {
  return request<Activity>(`/activities/${id}`, "PATCH", form);
}

export function validateActivity(id: number, body: ActivityValidationRequest) {
  return request<Activity>(`/activities/${id}/validations`, "POST", body);
}

export function getDuplicates() {
  return request<DuplicatePair[]>("/activities/duplicates");
}

// RN-03: the uses of the removed activity move to the one that is kept
export function mergeActivity(id: number, into: number) {
  return request<Activity>(`/activities/${id}/merge`, "POST", { into });
}

export function dismissDuplicate(pairId: number) {
  return request<DuplicatePair>(`/activities/duplicates/${pairId}/dismiss`, "POST");
}

export function useActivities() {
  return useQuery({ queryKey: ["activities", "all"], queryFn: getActivities });
}

export function usePackageActivities(packageId: number | undefined) {
  return useQuery({
    queryKey: ["activities", { package: packageId }],
    queryFn: () => getPackageActivities(packageId!),
    enabled: packageId !== undefined,
  });
}

export function useDuplicates(enabled: boolean) {
  return useQuery({ queryKey: ["activities", "duplicates"], queryFn: getDuplicates, enabled });
}

export function useSaveActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }: { id: number | null; form: ActivityForm }) =>
      id === null ? createActivity(form) : updateActivity(id, form),
    // A new activity may open a duplicate pair
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activities"] }),
  });
}

export function useValidateActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ActivityValidationRequest }) => validateActivity(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activities"] }),
  });
}

export function useMergeActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, into }: { id: number; into: number }) => mergeActivity(id, into),
    // The kept activity's uses and the itineraries that used the removed one both change
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
    },
  });
}

export function useDismissDuplicate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dismissDuplicate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activities", "duplicates"] }),
  });
}

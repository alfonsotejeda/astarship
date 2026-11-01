import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "./client";

export type ModificationRequestStatus = "requested" | "in_progress" | "resolved" | "denied";

export interface ModificationRequest {
  id: number;
  itinerary_id: number;
  package_id: number;
  package_name: string;
  tourist_id: number;
  tourist_name: string;
  // The tourist's travel group in that package, if any
  group_name: string | null;
  // The guide assigned to the tourist's itinerary
  guide_name: string;
  // The extra guide the tourist asked for (RF-30)
  support_guide_name: string | null;
  // RN-08: true when the current guide is asked as support, not as the assigned guide
  is_support: boolean;
  request_date: string;
  description: string;
  activity_names: string[];
  status: ModificationRequestStatus;
  result: string | null;
  // The itinerary that replaced the old one when the change was made (RF-31)
  new_itinerary_id: number | null;
}

export interface SupportGuide {
  id: number;
  name: string;
  specialty: string | null;
}

export interface ModificationRequestCreate {
  itinerary_id: number;
  activity_ids: number[];
  description: string;
  support_guide_id: number | null;
}

export interface ModificationRequestUpdate {
  status: ModificationRequestStatus;
  result?: string;
  new_itinerary_id?: number | null;
  notify_tourist?: boolean;
}

// The API scopes the list by role (RNF-10): a tourist gets theirs, a guide the ones assigned or asked as support
export function getModificationRequests() {
  return request<ModificationRequest[]>("/modification-requests");
}

// The other guides of the itinerary's package who can support the request
export function getSupportGuides(itineraryId: number) {
  return request<SupportGuide[]>(`/me/assignments/${itineraryId}/support-guides`);
}

export function createModificationRequest(body: ModificationRequestCreate) {
  return request<ModificationRequest>("/modification-requests", "POST", body);
}

export function updateModificationRequest(id: number, body: ModificationRequestUpdate) {
  return request<ModificationRequest>(`/modification-requests/${id}`, "PATCH", body);
}

export function useModificationRequests() {
  return useQuery({ queryKey: ["modification-requests"], queryFn: getModificationRequests });
}

export function useSupportGuides(itineraryId: number | null) {
  return useQuery({
    queryKey: ["me", "assignments", itineraryId, "support-guides"],
    queryFn: () => getSupportGuides(itineraryId as number),
    enabled: itineraryId !== null,
  });
}

export function useCreateModificationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createModificationRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["modification-requests"] }),
  });
}

export function useUpdateModificationRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...body }: ModificationRequestUpdate & { id: number }) => updateModificationRequest(id, body),
    // A new itinerary changes the tourist's assignment too
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modification-requests"] });
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
    },
  });
}

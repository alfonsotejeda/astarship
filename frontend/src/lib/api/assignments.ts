import { useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "./client";

export interface AssignRequest {
  user_ids: number[];
  start_date: string;
}

export interface AssignResult {
  itinerary_id: number;
  user_ids: number[];
}

// 409 if a tourist already has an itinerary of the package (RN-04)
export function assignItinerary(itineraryId: number, body: AssignRequest) {
  return request<AssignResult>(`/itineraries/${itineraryId}/assignments`, "POST", body);
}

export function useAssignItinerary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itineraryId, ...body }: AssignRequest & { itineraryId: number }) => assignItinerary(itineraryId, body),
    // The group's members, the itinerary's status, the tourists' trips and their bookings all change
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-groups"] });
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Activity } from "./activities";
import { request } from "./client";
import type { TravelMode } from "./trips";

export interface Attraction {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  // Activities that take place there (Activity —At— Attraction)
  activity_count: number;
}

// An edge of the attraction network (RF-32); it lives outside the relational schema (RNF-02)
export interface AttractionConnection {
  attraction_id: number;
  name: string;
  minutes: number;
  cost: number;
  mode: TravelMode;
}

export interface AttractionDetail extends Attraction {
  activities: Activity[];
  connections: AttractionConnection[];
}

export interface AttractionForm {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export function getAttractions() {
  return request<Attraction[]>("/attractions");
}

export function getAttraction(id: number) {
  return request<AttractionDetail>(`/attractions/${id}`);
}

// RF-01: guides register them
export function createAttraction(form: AttractionForm) {
  return request<Attraction>("/attractions", "POST", form);
}

// Only the admin edits and deletes
export function updateAttraction(id: number, form: AttractionForm) {
  return request<Attraction>(`/attractions/${id}`, "PATCH", form);
}

// 409 while an activity still takes place there
export function deleteAttraction(id: number) {
  return request<void>(`/attractions/${id}`, "DELETE");
}

export function useAttractions() {
  return useQuery({ queryKey: ["attractions"], queryFn: getAttractions });
}

export function useAttraction(id: number) {
  return useQuery({ queryKey: ["attractions", id], queryFn: () => getAttraction(id) });
}

export function useSaveAttraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }: { id: number | null; form: AttractionForm }) =>
      id === null ? createAttraction(form) : updateAttraction(id, form),
    // Activities show the attraction's name
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attractions"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

export function useDeleteAttraction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAttraction,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attractions"] }),
  });
}

import { useQuery } from "@tanstack/react-query";
import { request } from "./client";

export interface Category {
  id: number;
  name: string;
}

export interface ActivityTypeItem {
  code: string;
  name: string;
}

export interface Attraction {
  id: number;
  name: string;
}

export function getCategories() {
  return request<Category[]>("/categories");
}

export function getActivityTypes() {
  return request<ActivityTypeItem[]>("/activity-types");
}

export function getAttractions() {
  return request<Attraction[]>("/attractions");
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: getCategories, staleTime: Infinity });
}

export function useActivityTypes() {
  return useQuery({ queryKey: ["activity-types"], queryFn: getActivityTypes, staleTime: Infinity });
}

export function useAttractions() {
  return useQuery({ queryKey: ["attractions"], queryFn: getAttractions, staleTime: Infinity });
}

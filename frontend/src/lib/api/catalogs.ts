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

export function getCategories() {
  return request<Category[]>("/categories");
}

export function getActivityTypes() {
  return request<ActivityTypeItem[]>("/activity-types");
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: getCategories, staleTime: Infinity });
}

export function useActivityTypes() {
  return useQuery({ queryKey: ["activity-types"], queryFn: getActivityTypes, staleTime: Infinity });
}

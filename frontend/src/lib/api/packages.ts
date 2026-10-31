import { useQuery } from "@tanstack/react-query";
import type { Category } from "./catalogs";
import { request } from "./client";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type PackagePermission = "edit_package" | "validate_package" | "generate_itinerary" | "validate_itinerary";

export interface Package {
  id: number;
  name: string;
  destination: string;
  status: ReviewStatus;
  creation_date: string;
  admin_id: number;
  // Categories to cover (pantallas.md §6, PUT /packages/{id}/categories)
  categories: Category[];
}

// With a permission, only the packages where the current user holds it
export function getPackages(permission?: PackagePermission) {
  return request<Package[]>(permission ? `/packages?permission=${permission}` : "/packages");
}

export function usePackages(permission?: PackagePermission) {
  return useQuery({ queryKey: ["packages", { permission }], queryFn: () => getPackages(permission) });
}

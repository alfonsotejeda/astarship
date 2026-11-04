import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Category } from "./catalogs";
import { request } from "./client";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type PackagePermission = "edit_package" | "validate_package" | "generate_itinerary" | "validate_itinerary";

export type PackageValidationResult = "approved" | "rejected";

export interface PackageValidation {
  reviewer_id: number;
  reviewer_name: string;
  validation_date: string;
  result: PackageValidationResult;
  observations: string | null;
}

// Someone with at least one permission on the package (pantallas.md §2.1)
export interface PackagePerson {
  user_id: number;
  name: string;
  permissions: PackagePermission[];
}

export interface Package {
  id: number;
  name: string;
  destination: string;
  status: ReviewStatus;
  creation_date: string;
  admin_id: number;
  admin_name: string;
  // Categories to cover (pantallas.md §6, PUT /packages/{id}/categories)
  categories: Category[];
  approved_itineraries: number;
  total_itineraries: number;
  enrolled: number;
  people: PackagePerson[];
  // What the current user may do with the package; the API applies RNF-10
  my_permissions: PackagePermission[];
  can_edit: boolean;
  can_validate: boolean;
  last_validation: PackageValidation | null;
}

export interface PackageForm {
  name: string;
  destination: string;
  category_ids: number[];
}

export interface PackageValidationRequest {
  result: PackageValidationResult;
  observations: string;
}

// Without a permission, the packages the current user may see; with one, only those where they hold it
export function getPackages(permission?: PackagePermission) {
  return request<Package[]>(permission ? `/packages?permission=${permission}` : "/packages");
}

export async function createPackage({ category_ids, ...fields }: PackageForm) {
  const created = await request<Package>("/packages", "POST", fields);
  return request<Package>(`/packages/${created.id}/categories`, "PUT", { category_ids });
}

// RN-11: the API sends a validated package back to pending when its categories change
export async function updatePackage(id: number, { category_ids, ...fields }: PackageForm) {
  await request<Package>(`/packages/${id}`, "PATCH", fields);
  return request<Package>(`/packages/${id}/categories`, "PUT", { category_ids });
}

export function validatePackage(id: number, body: PackageValidationRequest) {
  return request<Package>(`/packages/${id}/validations`, "POST", body);
}

export function usePackages(permission?: PackagePermission) {
  return useQuery({ queryKey: ["packages", { permission }], queryFn: () => getPackages(permission) });
}

export function useSavePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }: { id: number | null; form: PackageForm }) =>
      id === null ? createPackage(form) : updatePackage(id, form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["packages"] }),
  });
}

export function useValidatePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: PackageValidationRequest }) => validatePackage(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["packages"] }),
  });
}

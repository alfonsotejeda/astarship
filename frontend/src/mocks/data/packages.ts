import type { PackageValidationResult, ReviewStatus } from "@/lib/api/packages";

export interface PackageRecord {
  id: number;
  name: string;
  destination: string;
  status: ReviewStatus;
  creation_date: string;
  admin_id: number;
  category_ids: number[];
  enrolled: number;
}

export interface PackageValidationRecord {
  package_id: number;
  reviewer_id: number;
  validation_date: string;
  result: PackageValidationResult;
  observations: string | null;
}

export const packages: PackageRecord[] = [
  { id: 1, name: "La Habana colonial", destination: "La Habana", status: "approved", creation_date: "2026-09-02", admin_id: 4, category_ids: [1, 2, 3, 4, 5], enrolled: 38 },
  { id: 2, name: "Viñales natural", destination: "Viñales", status: "approved", creation_date: "2026-09-10", admin_id: 4, category_ids: [5, 2], enrolled: 21 },
  { id: 3, name: "Trinidad y Topes de Collantes", destination: "Trinidad", status: "approved", creation_date: "2026-09-15", admin_id: 4, category_ids: [1, 5], enrolled: 26 },
  { id: 4, name: "Santiago de Cuba", destination: "Santiago de Cuba", status: "pending", creation_date: "2026-10-12", admin_id: 4, category_ids: [1, 4], enrolled: 0 },
];

export const packageValidations: PackageValidationRecord[] = [
  { package_id: 1, reviewer_id: 5, validation_date: "2026-09-03", result: "approved", observations: null },
  { package_id: 2, reviewer_id: 5, validation_date: "2026-09-11", result: "approved", observations: null },
  { package_id: 3, reviewer_id: 5, validation_date: "2026-09-16", result: "approved", observations: "Revisar los horarios de Topes en temporada de lluvias." },
];

export const nextPackageId = { value: 5 };

export function findPackage(id: number) {
  return packages.find(pkg => pkg.id === id);
}

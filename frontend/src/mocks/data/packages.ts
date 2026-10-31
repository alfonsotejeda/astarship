import type { ReviewStatus } from "@/lib/api/packages";

export interface PackageRecord {
  id: number;
  name: string;
  destination: string;
  status: ReviewStatus;
  creation_date: string;
  admin_id: number;
  category_ids: number[];
}

export const packages: PackageRecord[] = [
  { id: 1, name: "La Habana colonial", destination: "La Habana", status: "approved", creation_date: "2026-09-02", admin_id: 4, category_ids: [1, 2, 3, 4, 5] },
  { id: 2, name: "Viñales natural", destination: "Viñales", status: "approved", creation_date: "2026-09-10", admin_id: 4, category_ids: [5, 2] },
  { id: 3, name: "Trinidad y Topes de Collantes", destination: "Trinidad", status: "pending", creation_date: "2026-10-01", admin_id: 4, category_ids: [1, 5] },
];

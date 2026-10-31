import type { Package } from "@/lib/api/packages";
import { categories } from "../data/catalogs";
import { packages } from "../data/packages";
import type { PackageRecord } from "../data/packages";
import { authorizations, CURRENT_USER_ID } from "../data/users";
import type { MockRoute } from "../types";

export function toPackage({ category_ids, ...record }: PackageRecord): Package {
  return { ...record, categories: categories.filter(category => category_ids.includes(category.id)) };
}

// Generating needs the permission and a validated package (RN-02, RN-09)
function generablePackageIds() {
  const allowed = authorizations
    .filter(item => item.guide_id === CURRENT_USER_ID && item.can_generate)
    .map(item => item.package_id);
  return packages.filter(item => item.status === "approved" && allowed.includes(item.id)).map(item => item.id);
}

export const packageRoutes: MockRoute[] = [
  {
    method: "GET",
    path: "/packages",
    handler: ({ query }) => {
      const ids = query.get("permission") === "generate_itinerary" ? generablePackageIds() : null;
      return packages.filter(item => !ids || ids.includes(item.id)).map(toPackage);
    },
  },
];

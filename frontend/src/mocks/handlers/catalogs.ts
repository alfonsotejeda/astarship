import { activityTypes, categories } from "../data/catalogs";
import type { MockRoute } from "../types";

export const catalogRoutes: MockRoute[] = [
  { method: "GET", path: "/categories", handler: () => categories },
  { method: "GET", path: "/activity-types", handler: () => activityTypes },
];

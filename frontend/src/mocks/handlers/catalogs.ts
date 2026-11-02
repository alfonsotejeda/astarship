import { activityTypes, categories } from "../data/catalogs";
import { attractions } from "../data/activities";
import type { MockRoute } from "../types";

export const catalogRoutes: MockRoute[] = [
  { method: "GET", path: "/categories", handler: () => categories },
  { method: "GET", path: "/activity-types", handler: () => activityTypes },
  { method: "GET", path: "/attractions", handler: () => attractions.map(({ id, name }) => ({ id, name })) },
];

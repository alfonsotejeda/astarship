import { ApiError } from "@/lib/api/client";
import type { Method } from "@/lib/api/client";
import { activityRoutes } from "./handlers/activities";
import { catalogRoutes } from "./handlers/catalogs";
import { itineraryRoutes } from "./handlers/itineraries";
import { packageRoutes } from "./handlers/packages";
import type { MockRoute } from "./types";

// Each page adds its resource's routes here
const ROUTES: MockRoute[] = [...catalogRoutes, ...packageRoutes, ...activityRoutes, ...itineraryRoutes];

// Enough to see the loading states
const DELAY_MS = 400;

function match(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split("/");
  const pathParts = path.split("/");
  if (patternParts.length !== pathParts.length) return null;

  const params: Record<string, string> = {};
  for (const [index, part] of patternParts.entries()) {
    if (part.startsWith(":")) params[part.slice(1)] = decodeURIComponent(pathParts[index]);
    else if (part !== pathParts[index]) return null;
  }
  return params;
}

export async function mockRequest<T>(url: string, method: Method, body?: unknown): Promise<T> {
  await new Promise(resolve => setTimeout(resolve, DELAY_MS));

  const [path, search = ""] = url.split("?");
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const params = match(route.path, path);
    // A copy, so the page never mutates the mock tables
    if (params) return structuredClone(route.handler({ params, query: new URLSearchParams(search), body })) as T;
  }

  throw new ApiError(404, `Sin mock para ${method} ${path}`);
}

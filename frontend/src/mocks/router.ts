import { ApiError } from "@/lib/api/client";
import type { Method } from "@/lib/api/client";
import { activityRoutes } from "./handlers/activities";
import { catalogRoutes } from "./handlers/catalogs";
import { itineraryRoutes } from "./handlers/itineraries";
import { packageRoutes } from "./handlers/packages";
import { peopleRoutes } from "./handlers/people";
import { requestRoutes } from "./handlers/requests";
import { reviewRoutes } from "./handlers/reviews";
import { tripRoutes } from "./handlers/trips";
import type { MockRoute } from "./types";

// Each page adds its resource's routes here
const ROUTES: MockRoute[] = [
  ...catalogRoutes,
  ...packageRoutes,
  ...activityRoutes,
  ...itineraryRoutes,
  ...reviewRoutes,
  ...tripRoutes,
  ...peopleRoutes,
  ...requestRoutes,
];

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

// Demo logins use `mock-<id>`; a real backend login carries the id in the JWT subject
function tokenUserId(token: string | null): number | null {
  if (!token) return null;
  if (token.startsWith("mock-")) {
    const id = Number(token.slice("mock-".length));
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const data = JSON.parse(atob(padded)) as { sub?: unknown };
    const id = Number(data.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export async function mockRequest<T>(url: string, method: Method, body: unknown, token: string | null): Promise<T> {
  await new Promise(resolve => setTimeout(resolve, DELAY_MS));

  const userId = tokenUserId(token);
  if (userId === null) throw new ApiError(401, "Inicia sesión para continuar.");

  const [path, search = ""] = url.split("?");
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const params = match(route.path, path);
    // A copy, so the page never mutates the mock tables
    if (params) return structuredClone(route.handler({ userId, params, query: new URLSearchParams(search), body })) as T;
  }

  throw new ApiError(404, `Sin mock para ${method} ${path}`);
}

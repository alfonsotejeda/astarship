import type { Method } from "@/lib/api/client";

export interface MockRequest {
  // The logged-in user, read from the "mock-<id>" token
  userId: number;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
}

export interface MockRoute {
  method: Method;
  // Express-style pattern: "/itineraries/:id/submit"
  path: string;
  handler: (request: MockRequest) => unknown;
}

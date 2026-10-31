import type { Method } from "@/lib/api/client";

export interface MockRequest {
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

const API_URL = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;

// With mocks on, requests are answered by src/mocks instead of the backend
const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

let token: string | null = null;

export function setToken(value: string | null) {
  token = value;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function send<T>(path: string, method: Method, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(API_URL + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) throw new ApiError(response.status, await errorMessage(response));
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function request<T>(path: string, method: Method = "GET", body?: unknown): Promise<T> {
  if (USE_MOCKS) {
    const { mockRequest } = await import("@/mocks/router");
    return mockRequest<T>(path, method, body, token);
  }

  return send<T>(path, method, body);
}

// Auth is already implemented in the backend even while the rest of the screens use mocks
export function requestBackend<T>(path: string, method: Method = "GET", body?: unknown): Promise<T> {
  return send<T>(path, method, body);
}

async function errorMessage(response: Response): Promise<string> {
  const data = await response.json().catch(() => null);
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail)) {
    const messages = data.detail
      .map((item: { msg?: unknown }) => (typeof item.msg === "string" ? item.msg : null))
      .filter(Boolean);
    if (messages.length > 0) return messages.join(". ");
  }
  return response.statusText;
}

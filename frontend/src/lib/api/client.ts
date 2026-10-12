const API_URL = `${import.meta.env.VITE_API_BASE_URL ?? ""}/api`;

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

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export async function request<T>(path: string, method: Method = "GET", body?: unknown): Promise<T> {
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

async function errorMessage(response: Response): Promise<string> {
  const data = await response.json().catch(() => null);
  return typeof data?.detail === "string" ? data.detail : response.statusText;
}

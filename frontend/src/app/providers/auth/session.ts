import type { Role, User } from "./roles";

const SESSION_KEY = "astarship.session";
const ROLES: readonly Role[] = ["guide", "manager", "tourist", "admin"];

export interface StoredSession {
  token: string;
  user: User;
}

function isUser(value: unknown): value is User {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<User>;
  return (
    typeof candidate.id === "number" &&
    typeof candidate.name === "string" &&
    ROLES.includes(candidate.role as Role)
  );
}

function parseSession(raw: string | null): StoredSession | null {
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof data.token !== "string" || !isUser(data.user)) return null;
    return { token: data.token, user: data.user };
  } catch {
    return null;
  }
}

export function readSession(): StoredSession | null {
  try {
    return (
      parseSession(localStorage.getItem(SESSION_KEY)) ??
      parseSession(sessionStorage.getItem(SESSION_KEY))
    );
  } catch {
    return null;
  }
}

export function saveSession(session: StoredSession, remember: boolean): void {
  clearSession();
  try {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // The session still lives in memory if storage is unavailable.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}

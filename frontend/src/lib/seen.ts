import { useMemo, useSyncExternalStore } from "react";
import type { Booking } from "@/lib/api/bookings";
import type { ModificationRequest } from "@/lib/api/requests";

// What the user already saw resolved, so the menu only counts what is new.
// Kept in this browser: losing it only shows a count again, never hides data
export type SeenKind = "requests" | "bookings";

const listeners = new Set<() => void>();

function storageKey(userId: number, kind: SeenKind) {
  return `astarship:seen:${userId}:${kind}`;
}

function readRaw(userId: number, kind: SeenKind) {
  try {
    return localStorage.getItem(storageKey(userId, kind)) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function markSeen(userId: number, kind: SeenKind, keys: string[]) {
  const value = JSON.stringify([...keys].sort());
  if (readRaw(userId, kind) === value) return;
  try {
    localStorage.setItem(storageKey(userId, kind), value);
  } catch {
    // Without storage the count simply stays
  }
  listeners.forEach(listener => listener());
}

// A request counts again if its outcome changes, hence the status in the key
export function resolvedRequestKeys(requests: ModificationRequest[]) {
  return requests
    .filter(item => item.status === "resolved" || item.status === "denied")
    .map(item => `${item.id}:${item.status}`);
}

export function resolvedBookingKeys(bookings: Booking[]) {
  return bookings
    .filter(item => item.status === "assigned" || item.status === "rejected")
    .map(item => `${item.package_id}:${item.status}`);
}

export function useSeen(userId: number, kind: SeenKind): Set<string> {
  const raw = useSyncExternalStore(subscribe, () => readRaw(userId, kind));
  return useMemo(() => {
    try {
      return new Set(JSON.parse(raw) as string[]);
    } catch {
      return new Set<string>();
    }
  }, [raw]);
}

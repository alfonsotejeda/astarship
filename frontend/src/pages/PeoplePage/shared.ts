import type { Package } from "@/lib/api/packages";

export type QueryState<T> = {
  data?: T;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => unknown;
};

export function byName<T extends { name: string }>(items: T[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

// RN-09: only a validated package admits enrolments and groups
export function approved(packages: Package[]) {
  return byName(packages.filter(pkg => pkg.status === "approved"));
}

export function touristsText(count: number) {
  return count === 1 ? "1 turista" : `${count} turistas`;
}

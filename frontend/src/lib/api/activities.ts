import { useQuery } from "@tanstack/react-query";
import type { ActivityType } from "@/components/Badge/Badge";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import { request } from "./client";
import type { ReviewStatus } from "./packages";

export interface Activity {
  id: number;
  name: string;
  effort_level: number;
  status: ReviewStatus;
  creation_date: string;
  activity_type_code: string | null;
  category_id: number | null;
  user_id: number | null;
  // Expanded for display: Attraction, Duration and the author (pantallas.md §2)
  attraction_name: string | null;
  author_name: string | null;
  duration_minutes: number;
}

const ACTIVITY_TYPES: ActivityType[] = ["visita", "excursion", "taller"];

export function toActivityType(code: string | null): ActivityType | undefined {
  return ACTIVITY_TYPES.find(type => type === code);
}

// Same scale as the reports: 1 low, 2 medium, 3 high
export function toEffortLevel(level: number): EffortLevel {
  if (level <= 1) return "bajo";
  if (level === 2) return "medio";
  return "alto";
}

// Approved activities of the bank that can be used in the package
export function getPackageActivities(packageId: number) {
  return request<Activity[]>(`/activities?package=${packageId}&status=approved`);
}

export function usePackageActivities(packageId: number | undefined) {
  return useQuery({
    queryKey: ["activities", { package: packageId }],
    queryFn: () => getPackageActivities(packageId!),
    enabled: packageId !== undefined,
  });
}

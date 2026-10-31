import type { ItinerarySummary } from "@/lib/api/itineraries";

// What the current user can review, oldest submission first
export function reviewQueue(items: ItinerarySummary[]) {
  return items
    .filter(item => item.review !== null)
    .sort((a, b) => (a.submitted_date ?? "").localeCompare(b.submitted_date ?? "") || a.id - b.id);
}

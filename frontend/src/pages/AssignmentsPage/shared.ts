import type { ItinerarySummary } from "@/lib/api/itineraries";
import { formatItineraryCode } from "@/lib/format";

export function itineraryLabel(item: ItinerarySummary) {
  const days = item.days === 1 ? "1 día" : `${item.days} días`;
  return `${formatItineraryCode(item.id)} · ${days} · ${item.guide_name}`;
}

export function touristCount(count: number) {
  return count === 1 ? "1 turista" : `${count} turistas`;
}

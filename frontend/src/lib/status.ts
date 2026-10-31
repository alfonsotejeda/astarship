import type { ItineraryStatus } from "@/lib/api/itineraries";
import type { ReviewStatus } from "@/components/StatusPill/StatusPill";

// API statuses (English) to the StatusPill ones (Spanish)
export const ITINERARY_STATUS: Record<ItineraryStatus, ReviewStatus> = {
  pending: "pendiente",
  validated: "validado",
  approved: "aprobado",
  rejected: "rechazado",
};

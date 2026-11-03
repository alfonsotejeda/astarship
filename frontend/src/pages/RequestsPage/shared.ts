import type { ModificationRequest as CardRequest } from "@/components/RequestCard/RequestCard";
import type { RequestStatus } from "@/components/StatusPill/StatusPill";
import type { ModificationRequest, ModificationRequestStatus } from "@/lib/api/requests";
import { formatDate, formatItineraryCode, isToday } from "@/lib/format";

export const REQUEST_STATUS: Record<ModificationRequestStatus, RequestStatus> = {
  requested: "solicitada",
  in_progress: "atendiendo",
  resolved: "resuelta",
  denied: "denegada",
};

export function isOpen(request: ModificationRequest) {
  return request.status === "requested" || request.status === "in_progress";
}

export function toCard(request: ModificationRequest, mine = false): CardRequest {
  return {
    tourist: mine ? "Tú" : request.tourist_name,
    group: mine ? undefined : (request.group_name ?? undefined),
    itinerary: formatItineraryCode(request.itinerary_id),
    date: isToday(request.request_date) ? "hoy" : formatDate(request.request_date),
    description: request.description,
    supportGuide: request.support_guide_name ?? undefined,
    status: REQUEST_STATUS[request.status],
    result: request.result ?? undefined,
  };
}

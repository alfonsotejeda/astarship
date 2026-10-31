import type { ItinerarySummary } from "@/lib/api/itineraries";
import { formatItineraryCode } from "@/lib/format";

// The status shown in the list: «assigned» is derived from the assignments
export type ListStatus = "pending" | "validated" | "approved" | "rejected" | "assigned";

export const STATUS_LABEL: Record<ListStatus, string> = {
  pending: "Pendiente",
  validated: "Validado",
  rejected: "Rechazado",
  approved: "Aprobado",
  assigned: "Asignado",
};

// Sorting by status follows the review flow, not the alphabet
export const STATUS_ORDER: Record<ListStatus, number> = {
  pending: 1,
  validated: 2,
  rejected: 3,
  approved: 4,
  assigned: 5,
};

export function listStatus(item: ItinerarySummary): ListStatus {
  return item.assigned ? "assigned" : item.status;
}

export function isBalanced(item: ItinerarySummary) {
  return item.criteria_met === item.criteria_total;
}

export function packageOptions(items: ItinerarySummary[], allLabel: string) {
  const packages = new Map(items.map(item => [String(item.package_id), item.package_name]));
  return [{ value: "", label: allLabel }, ...[...packages].map(([value, label]) => ({ value, label }))];
}

export function guideOptions(items: ItinerarySummary[]) {
  const guides = new Map(items.map(item => [String(item.guide_id), item.guide_name]));
  return [{ value: "", label: "Todos" }, ...[...guides].map(([value, label]) => ({ value, label }))];
}

export const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

export function matchesSearch(item: ItinerarySummary, query: string) {
  const text = `${formatItineraryCode(item.id)} ${item.package_name} ${item.guide_name}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

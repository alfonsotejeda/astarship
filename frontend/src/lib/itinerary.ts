import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import type { EffortCount } from "@/components/ItineraryCard/EffortSplit";
import type { RouteStop } from "@/components/RouteTimeline/RouteTimeline";
import type { AssignmentStatus, ReviewStatus } from "@/components/StatusPill/StatusPill";
import { toActivityType, toEffortLevel } from "@/lib/api/activities";
import type {
  CriterionKey,
  EffortCounts,
  ItineraryCriterion,
  ItineraryDay,
  ItineraryDetail,
  ItineraryStatus,
  ItinerarySummary,
  ProportionType,
} from "@/lib/api/itineraries";
import { formatDuration, formatItineraryCode, formatShortDate, formatTime } from "@/lib/format";
import { exportPdf } from "@/lib/pdf";

type TypeLabel = { code: string; label: string };

// API statuses (English) to the StatusPill ones (Spanish)
export const ITINERARY_STATUS: Record<ItineraryStatus, ReviewStatus> = {
  pending: "pendiente",
  validated: "validado",
  approved: "aprobado",
  rejected: "rechazado",
};

export const EFFORT_LABEL: Record<EffortLevel, string> = { bajo: "Bajo", medio: "Medio", alto: "Alto" };

export const CRITERION_LABEL: Record<CriterionKey, string> = {
  type_proportion: "Proporción por tipo",
  category_coverage: "Cobertura de categorías",
  activity_count: "Total de actividades",
  late_high_effort: "Esfuerzo alto al final del día",
};

// «Asignado» is derived: an approved itinerary with an assignment
export function itineraryStatus(item: { status: ItineraryStatus; assigned: boolean }): ReviewStatus | AssignmentStatus {
  return item.assigned ? "asignado" : ITINERARY_STATUS[item.status];
}

export function toEffortCount(effort: EffortCounts): EffortCount {
  return { bajo: effort.low, medio: effort.medium, alto: effort.high };
}

export function proportionText(proportion: ProportionType[]) {
  return `${proportion.map(item => item.value).join(" / ")} %`;
}

export function toCriteria(criteria: ItineraryCriterion[]) {
  return criteria.map(criterion => ({ ...criterion, label: CRITERION_LABEL[criterion.key] }));
}

export function toStops(day: ItineraryDay): RouteStop[] {
  return day.stops.map(stop => ({
    id: stop.activity_id,
    time: formatTime(stop.start_time),
    name: stop.activity_name,
    place: stop.attraction_name ?? undefined,
    type: toActivityType(stop.activity_type_code),
    effort: toEffortLevel(stop.effort_level),
    duration: formatDuration(stop.duration_minutes),
  }));
}

export function dayLabel(day: ItineraryDay) {
  return `Día ${day.day} · ${formatShortDate(day.date)}`;
}

// Same points as RouteTimeline: the busiest day fills the bar, so every day shares the scale
export function maxDayEffort(days: ItineraryDay[]) {
  return Math.max(0, ...days.map(day => day.stops.reduce((sum, stop) => sum + stop.effort_level, 0)));
}

export function exportItinerary(itinerary: ItineraryDetail, types: TypeLabel[]) {
  const typeLabel = (code: string | null) => types.find(type => type.code === code)?.label ?? "";

  exportPdf({
    title: `Itinerario ${formatItineraryCode(itinerary.id)} · ${itinerary.package_name}`,
    filter: `${itinerary.days.length} días · ${itinerary.activity_count} actividades`,
    columns: ["Día", "Hora", "Actividad", "Lugar", "Tipo", "Esfuerzo", "Duración"],
    rows: itinerary.days.flatMap(day =>
      day.stops.map(stop => [
        dayLabel(day),
        formatTime(stop.start_time),
        stop.activity_name,
        stop.attraction_name ?? "",
        typeLabel(stop.activity_type_code),
        EFFORT_LABEL[toEffortLevel(stop.effort_level)],
        formatDuration(stop.duration_minutes),
      ]),
    ),
  });
}

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

export const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

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

export function matchesSearch(item: ItinerarySummary, query: string) {
  const text = `${formatItineraryCode(item.id)} ${item.package_name} ${item.guide_name}`.toLowerCase();
  return text.includes(query.trim().toLowerCase());
}

// What the current user can review, oldest submission first
export function reviewQueue(items: ItinerarySummary[]) {
  return items
    .filter(item => item.review !== null)
    .sort((a, b) => (a.submitted_date ?? "").localeCompare(b.submitted_date ?? "") || a.id - b.id);
}

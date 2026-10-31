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

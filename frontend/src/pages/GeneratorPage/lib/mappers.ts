import type { Activity as RowActivity } from "@/components/ActivityRow/ActivityRow";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import type { RouteStop } from "@/components/RouteTimeline/RouteTimeline";
import { toActivityType, toEffortLevel } from "@/lib/api/activities";
import type { Activity } from "@/lib/api/activities";
import type { CriterionKey, ItineraryDay, ItineraryDetail } from "@/lib/api/itineraries";
import { formatDuration, formatItineraryCode, formatShortDate, formatTime } from "@/lib/format";
import { exportPdf } from "@/lib/pdf";
import type { TypeOption } from "./form";

const EFFORT_LABEL: Record<EffortLevel, string> = { bajo: "Bajo", medio: "Medio", alto: "Alto" };

export const CRITERION_LABEL: Record<CriterionKey, string> = {
  type_proportion: "Proporción por tipo",
  category_coverage: "Cobertura de categorías",
  activity_count: "Total de actividades",
  late_high_effort: "Esfuerzo alto al final del día",
};

export function toRowActivity(activity: Activity, category: string | undefined): RowActivity {
  return {
    id: activity.id,
    name: activity.name,
    attraction: activity.attraction_name ?? undefined,
    author: activity.author_name ?? undefined,
    type: toActivityType(activity.activity_type_code),
    category,
    effort: toEffortLevel(activity.effort_level),
    duration: formatDuration(activity.duration_minutes),
  };
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

export function exportItinerary(itinerary: ItineraryDetail, types: TypeOption[]) {
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

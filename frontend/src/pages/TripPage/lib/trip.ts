import type { EffortCount } from "@/components/ItineraryCard/EffortSplit";
import type { RouteStop } from "@/components/RouteTimeline/RouteTimeline";
import type { AssignmentStatus as PillAssignment, VisitStatus as PillVisit } from "@/components/StatusPill/StatusPill";
import { toEffortLevel } from "@/lib/api/activities";
import type { AssignmentStatus, TravelMode, TripDay, TripStop, VisitStatus } from "@/lib/api/trips";
import { formatDuration, formatTime, formatWeekday } from "@/lib/format";
import { EFFORT_LABEL, toStops } from "@/lib/itinerary";
import { exportPdf } from "@/lib/pdf";

export const ASSIGNMENT_STATUS: Record<AssignmentStatus, PillAssignment> = {
  assigned: "asignado",
  in_progress: "en_curso",
  finished: "finalizado",
};

const VISIT_TO_PILL: Record<VisitStatus, PillVisit> = { done: "realizada", skipped: "abandonada" };

export const PILL_TO_VISIT: Record<Exclude<PillVisit, "pendiente">, VisitStatus> = {
  realizada: "done",
  abandonada: "skipped",
};

const TRAVEL_MODE: Record<TravelMode, string> = { walk: "a pie", taxi: "en taxi", bus: "en autobús" };

export const RATING_WORDS = ["Sin valorar", "Muy mal", "Mal", "Regular", "Bien", "Excelente"];

export function toTripStops(day: TripDay): RouteStop[] {
  return toStops(day).map((stop, index) => {
    const trip = day.stops[index];
    return {
      ...stop,
      status: trip.visit_status ? VISIT_TO_PILL[trip.visit_status] : "pendiente",
      rating: trip.rating ?? undefined,
    };
  });
}

// The activity in progress is the first one not marked yet
export function currentIndex(day: TripDay) {
  const index = day.stops.findIndex(stop => stop.visit_status === null);
  return index >= 0 ? index : undefined;
}

export function doneCount(day: TripDay) {
  return day.stops.filter(stop => stop.visit_status !== null).length;
}

export function dayEffort(day: TripDay): EffortCount {
  const effort = { bajo: 0, medio: 0, alto: 0 };
  day.stops.forEach(stop => effort[toEffortLevel(stop.effort_level)]++);
  return effort;
}

export function travelText(stop: TripStop, previous: TripStop | undefined) {
  if (!stop.travel) return null;
  const from = previous?.attraction_name ?? previous?.activity_name;
  const text = `${stop.travel.minutes} min ${TRAVEL_MODE[stop.travel.mode]}`;
  return from ? `${text} desde ${from}` : text;
}

export function dayTabLabel(day: TripDay, today?: number) {
  return `Día ${day.day} · ${day.day === today ? "hoy" : formatWeekday(day.date, true)}`;
}

export function exportTrip(title: string, days: TripDay[]) {
  const visitLabel = (stop: TripStop) =>
    stop.visit_status === "done" ? "Realizada" : stop.visit_status === "skipped" ? "No realizada" : "Pendiente";

  exportPdf({
    title,
    columns: ["Día", "Hora", "Actividad", "Lugar", "Esfuerzo", "Duración", "Estado"],
    rows: days.flatMap(day =>
      day.stops.map(stop => [
        `Día ${day.day}`,
        formatTime(stop.start_time),
        stop.activity_name,
        stop.attraction_name ?? "",
        EFFORT_LABEL[toEffortLevel(stop.effort_level)],
        formatDuration(stop.duration_minutes),
        visitLabel(stop),
      ]),
    ),
  });
}

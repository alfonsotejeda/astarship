import type { CriterionKey, ItineraryStatus } from "@/lib/api/itineraries";

export type DayRecord = { date: string; stops: [activityId: number, startTime: string][] };

export interface ItineraryRecord {
  id: number;
  package_id: number;
  guide_id: number;
  status: ItineraryStatus;
  assigned: boolean;
  generated_at: string;
  submitted_date: string | null;
  replaces_id: number | null;
  // Visita / Excursión / Taller, in %
  proportion: [number, number, number];
  avoid_late_high_effort: boolean;
  days: DayRecord[];
  // Criteria that were not met; the rest are built as met from the parameters
  failed?: Partial<Record<CriterionKey, { actual: string; detail?: string }>>;
  discarded?: { activity_id: number; reason: string }[];
}

export interface ReviewRecord {
  itinerary_id: number;
  reviewer_id: number;
  review_date: string;
  result: ItineraryStatus;
  observations: string | null;
}

export function route(start: string, days: DayRecord["stops"][]): DayRecord[] {
  const first = new Date(`${start}T00:00:00Z`);
  return days.map((stops, index) => {
    const date = new Date(first);
    date.setUTCDate(first.getUTCDate() + index);
    return { date: date.toISOString().slice(0, 10), stops };
  });
}

const HABANA_SHORT: DayRecord["stops"][] = [
  [[1, "09:00"], [2, "10:30"], [3, "13:00"], [7, "16:00"]],
  [[8, "09:00"], [5, "11:30"], [6, "15:00"], [9, "20:30"]],
];

const HABANA_LONG: DayRecord["stops"][] = [
  [[1, "09:00"], [2, "10:30"], [3, "13:00"], [5, "16:00"]],
  [[8, "09:00"], [7, "11:30"], [14, "15:00"], [9, "20:30"]],
  [[11, "08:30"], [12, "11:30"], [13, "13:30"], [4, "17:00"]],
];

const VINALES: DayRecord["stops"][] = [
  [[15, "09:00"], [16, "11:00"], [18, "13:30"]],
  [[17, "08:30"], [19, "17:30"]],
];

const TRINIDAD: DayRecord["stops"][] = [
  [[20, "09:00"], [24, "10:30"], [23, "15:00"]],
  [[21, "08:00"], [22, "14:00"]],
];

// What the fake generator returns for each package
export const GENERATED_ROUTES: Record<number, DayRecord["stops"][]> = { 1: HABANA_SHORT, 2: VINALES, 3: TRINIDAD };

export const GENERATED_DISCARDED: Record<number, ItineraryRecord["discarded"]> = {
  1: [{ activity_id: 4, reason: "esfuerzo alto a las 15:00 del día 2 rompía «Evitar esfuerzo alto al final del día»." }],
};

export const itineraries: ItineraryRecord[] = [
  { id: 156, package_id: 1, guide_id: 1, status: "pending", assigned: false, generated_at: "2026-10-11T16:42:00", submitted_date: null, replaces_id: null, proportion: [40, 35, 25], avoid_late_high_effort: true, days: route("2026-10-13", HABANA_SHORT) },
  { id: 155, package_id: 1, guide_id: 2, status: "validated", assigned: false, generated_at: "2026-10-11T09:15:00", submitted_date: "2026-10-11", replaces_id: null, proportion: [50, 25, 25], avoid_late_high_effort: true, days: route("2026-10-20", HABANA_SHORT) },
  { id: 153, package_id: 2, guide_id: 2, status: "validated", assigned: false, generated_at: "2026-10-10T12:00:00", submitted_date: "2026-10-10", replaces_id: null, proportion: [30, 50, 20], avoid_late_high_effort: true, days: route("2026-10-22", VINALES), failed: { type_proportion: { actual: "40 / 40 / 20 %", detail: "Visita 10 puntos por encima" } } },
  { id: 151, package_id: 1, guide_id: 1, status: "validated", assigned: false, generated_at: "2026-10-10T10:20:00", submitted_date: "2026-10-10", replaces_id: 139, proportion: [40, 35, 25], avoid_late_high_effort: true, days: route("2026-10-24", HABANA_LONG), failed: { category_coverage: { actual: "4 de 5", detail: "Falta Música" }, late_high_effort: { actual: "1 (día 3)", detail: "Subida al Morro, 17:00" } } },
  { id: 148, package_id: 2, guide_id: 2, status: "approved", assigned: false, generated_at: "2026-10-08T11:00:00", submitted_date: "2026-10-08", replaces_id: null, proportion: [40, 40, 20], avoid_late_high_effort: true, days: route("2026-10-15", VINALES) },
  { id: 147, package_id: 3, guide_id: 3, status: "validated", assigned: false, generated_at: "2026-10-08T08:30:00", submitted_date: "2026-10-08", replaces_id: null, proportion: [35, 40, 25], avoid_late_high_effort: true, days: route("2026-10-18", TRINIDAD) },
  { id: 145, package_id: 2, guide_id: 2, status: "pending", assigned: false, generated_at: "2026-10-09T17:10:00", submitted_date: "2026-10-09", replaces_id: null, proportion: [40, 40, 20], avoid_late_high_effort: false, days: route("2026-10-27", VINALES) },
  { id: 142, package_id: 1, guide_id: 1, status: "approved", assigned: true, generated_at: "2026-10-06T10:00:00", submitted_date: "2026-10-06", replaces_id: null, proportion: [40, 35, 25], avoid_late_high_effort: true, days: route("2026-10-12", HABANA_LONG) },
  { id: 139, package_id: 1, guide_id: 2, status: "rejected", assigned: false, generated_at: "2026-10-05T09:00:00", submitted_date: "2026-10-05", replaces_id: null, proportion: [30, 50, 20], avoid_late_high_effort: false, days: route("2026-10-24", HABANA_LONG), failed: { category_coverage: { actual: "4 de 5", detail: "Falta Música" }, late_high_effort: { actual: "1 (día 3)", detail: "Subida al Morro, 17:00" } } },
  { id: 133, package_id: 3, guide_id: 3, status: "approved", assigned: true, generated_at: "2026-10-01T10:00:00", submitted_date: "2026-10-01", replaces_id: null, proportion: [40, 35, 25], avoid_late_high_effort: true, days: route("2026-10-06", TRINIDAD) },
  { id: 130, package_id: 2, guide_id: 1, status: "approved", assigned: false, generated_at: "2026-09-29T15:00:00", submitted_date: "2026-09-29", replaces_id: null, proportion: [40, 40, 20], avoid_late_high_effort: true, days: route("2026-10-04", VINALES), failed: { category_coverage: { actual: "1 de 2", detail: "Falta Gastronomía" } } },
  { id: 128, package_id: 1, guide_id: 3, status: "approved", assigned: true, generated_at: "2026-09-27T11:00:00", submitted_date: "2026-09-27", replaces_id: null, proportion: [40, 35, 25], avoid_late_high_effort: true, days: route("2026-09-30", HABANA_SHORT) },
  { id: 121, package_id: 3, guide_id: 2, status: "approved", assigned: false, generated_at: "2026-09-22T09:00:00", submitted_date: "2026-09-22", replaces_id: null, proportion: [30, 50, 20], avoid_late_high_effort: true, days: route("2026-09-26", TRINIDAD), failed: { type_proportion: { actual: "40 / 40 / 20 %", detail: "Visita 10 puntos por encima" } } },
];

export const reviews: ReviewRecord[] = [
  { itinerary_id: 155, reviewer_id: 3, review_date: "2026-10-11", result: "validated", observations: null },
  { itinerary_id: 153, reviewer_id: 1, review_date: "2026-10-10", result: "validated", observations: "Buena variedad de naturaleza." },
  { itinerary_id: 151, reviewer_id: 3, review_date: "2026-10-10", result: "validated", observations: null },
  { itinerary_id: 147, reviewer_id: 2, review_date: "2026-10-08", result: "validated", observations: null },
  { itinerary_id: 148, reviewer_id: 1, review_date: "2026-10-08", result: "validated", observations: null },
  { itinerary_id: 148, reviewer_id: 5, review_date: "2026-10-09", result: "approved", observations: "Buena distribución del esfuerzo." },
  { itinerary_id: 142, reviewer_id: 5, review_date: "2026-10-07", result: "approved", observations: "Aprobado y asignado al grupo Habana Octubre A." },
  { itinerary_id: 139, reviewer_id: 3, review_date: "2026-10-05", result: "validated", observations: null },
  { itinerary_id: 139, reviewer_id: 5, review_date: "2026-10-05", result: "rejected", observations: "Demasiadas excursiones de esfuerzo alto seguidas." },
  { itinerary_id: 133, reviewer_id: 5, review_date: "2026-10-02", result: "approved", observations: null },
  { itinerary_id: 130, reviewer_id: 5, review_date: "2026-09-30", result: "approved", observations: "Falta Gastronomía, aceptable por temporada." },
  { itinerary_id: 128, reviewer_id: 5, review_date: "2026-09-28", result: "approved", observations: "Aprobado y asignado al grupo Habana Septiembre B." },
  { itinerary_id: 121, reviewer_id: 5, review_date: "2026-09-23", result: "approved", observations: null },
];

export const nextItineraryId = { value: 157 };

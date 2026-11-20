import type { VisitStatus } from "@/lib/api/trips";

export interface AssignmentRecord {
  itinerary_id: number;
  user_id: number;
  start_date: string;
  rating: number | null;
  comment: string | null;
}

export interface VisitRecord {
  itinerary_id: number;
  user_id: number;
  activity_id: number;
  status: VisitStatus;
  rating: number | null;
  comment?: string | null;
}

export interface AlternativeRecord {
  itinerary_id: number;
  // Day of the trip it applies to
  day: number;
  reason: string;
  activity_id: number;
  start_time: string;
}

// Relative to today, so «Hoy» always has a trip in progress
export function daysFromToday(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Daniel Ortega, the demo tourist
export const assignments: AssignmentRecord[] = [
  { itinerary_id: 142, user_id: 6, start_date: daysFromToday(-1), rating: null, comment: null },
  { itinerary_id: 148, user_id: 6, start_date: daysFromToday(7), rating: null, comment: null },
  { itinerary_id: 133, user_id: 6, start_date: daysFromToday(-70), rating: null, comment: null },
  { itinerary_id: 128, user_id: 6, start_date: daysFromToday(-130), rating: 4, comment: "Muy buen ritmo y un guía excelente." },
  // The rest of the groups, so guides see the ratings of their activities
  { itinerary_id: 142, user_id: 7, start_date: daysFromToday(-1), rating: null, comment: null },
  { itinerary_id: 142, user_id: 8, start_date: daysFromToday(-1), rating: null, comment: null },
  { itinerary_id: 142, user_id: 9, start_date: daysFromToday(-1), rating: null, comment: null },
  { itinerary_id: 142, user_id: 11, start_date: daysFromToday(-1), rating: null, comment: null },
  { itinerary_id: 128, user_id: 12, start_date: daysFromToday(-40), rating: null, comment: null },
  { itinerary_id: 133, user_id: 15, start_date: daysFromToday(-70), rating: null, comment: null },
];

export const visits: VisitRecord[] = [
  { itinerary_id: 142, user_id: 6, activity_id: 1, status: "done", rating: 5, comment: "La guía explicó muy bien la historia." },
  { itinerary_id: 142, user_id: 6, activity_id: 2, status: "done", rating: 4 },
  { itinerary_id: 142, user_id: 6, activity_id: 3, status: "done", rating: 5, comment: "Lo mejor del viaje hasta ahora." },
  { itinerary_id: 142, user_id: 6, activity_id: 5, status: "skipped", rating: null },
  { itinerary_id: 142, user_id: 6, activity_id: 8, status: "done", rating: 4 },
  { itinerary_id: 142, user_id: 6, activity_id: 7, status: "done", rating: null },
  { itinerary_id: 133, user_id: 6, activity_id: 20, status: "done", rating: 5 },
  { itinerary_id: 133, user_id: 6, activity_id: 24, status: "done", rating: 4 },
  { itinerary_id: 133, user_id: 6, activity_id: 23, status: "done", rating: null },
  { itinerary_id: 133, user_id: 6, activity_id: 21, status: "skipped", rating: null },
  { itinerary_id: 133, user_id: 6, activity_id: 22, status: "done", rating: 5 },
  { itinerary_id: 128, user_id: 6, activity_id: 1, status: "done", rating: 5 },
  { itinerary_id: 128, user_id: 6, activity_id: 2, status: "done", rating: 4 },
  { itinerary_id: 128, user_id: 6, activity_id: 3, status: "done", rating: 4 },
  { itinerary_id: 128, user_id: 6, activity_id: 7, status: "done", rating: 3 },
  { itinerary_id: 142, user_id: 7, activity_id: 1, status: "done", rating: 5, comment: "La guía explicó muy bien la historia del castillo." },
  { itinerary_id: 142, user_id: 7, activity_id: 2, status: "done", rating: 4 },
  { itinerary_id: 142, user_id: 7, activity_id: 3, status: "done", rating: 5 },
  { itinerary_id: 142, user_id: 7, activity_id: 5, status: "done", rating: 4 },
  { itinerary_id: 142, user_id: 7, activity_id: 7, status: "done", rating: 5, comment: "Lo mejor del día." },
  { itinerary_id: 142, user_id: 8, activity_id: 1, status: "done", rating: 4 },
  { itinerary_id: 142, user_id: 8, activity_id: 2, status: "done", rating: 3, comment: "Mucha gente, pero merece la pena." },
  { itinerary_id: 142, user_id: 8, activity_id: 5, status: "skipped", rating: null },
  { itinerary_id: 142, user_id: 9, activity_id: 3, status: "done", rating: 5 },
  { itinerary_id: 142, user_id: 9, activity_id: 5, status: "done", rating: 4 },
  { itinerary_id: 142, user_id: 9, activity_id: 8, status: "done", rating: 4 },
  { itinerary_id: 142, user_id: 11, activity_id: 1, status: "done", rating: 4 },
  { itinerary_id: 142, user_id: 11, activity_id: 2, status: "done", rating: 2, comment: "Demasiado calor para tanto rato a pie." },
  { itinerary_id: 128, user_id: 12, activity_id: 1, status: "done", rating: 4 },
  { itinerary_id: 128, user_id: 12, activity_id: 5, status: "done", rating: 3, comment: "Muy grande para verlo en hora y media." },
  { itinerary_id: 128, user_id: 12, activity_id: 9, status: "done", rating: 5, comment: "Impresionante de noche." },
  { itinerary_id: 133, user_id: 15, activity_id: 20, status: "done", rating: 5 },
  { itinerary_id: 133, user_id: 15, activity_id: 24, status: "done", rating: 4 },
  { itinerary_id: 133, user_id: 15, activity_id: 22, status: "done", rating: 5, comment: "El tren es una maravilla." },
];

export const alternatives: AlternativeRecord[] = [
  { itinerary_id: 142, day: 2, reason: "La Casa de la Música abre hoy a las 17:00", activity_id: 14, start_time: "15:00:00" },
];

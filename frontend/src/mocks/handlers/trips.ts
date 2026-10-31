import { ApiError } from "@/lib/api/client";
import type {
  Assignment,
  AssignmentDetail,
  AssignmentStatus,
  Today,
  TripDay,
  TripRatingRequest,
  VisitRequest,
} from "@/lib/api/trips";
import { findActivityRecord } from "../data/activities";
import { alternatives, assignments, daysFromToday, visits } from "../data/assignments";
import type { AssignmentRecord } from "../data/assignments";
import { itineraries } from "../data/itineraries";
import { findUser } from "../data/users";
import type { MockRoute } from "../types";
import { activityCount, effortCounts, packageOf, toDays } from "./itineraries";

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function itineraryOf(assignment: AssignmentRecord) {
  const record = itineraries.find(item => item.id === assignment.itinerary_id);
  if (!record) throw new ApiError(404, "El itinerario no existe.");
  return record;
}

function endDate(assignment: AssignmentRecord) {
  return addDays(assignment.start_date, itineraryOf(assignment).days.length - 1);
}

function statusOf(assignment: AssignmentRecord): AssignmentStatus {
  const today = daysFromToday(0);
  if (today < assignment.start_date) return "assigned";
  if (today > endDate(assignment)) return "finished";
  return "in_progress";
}

// Travel time from the previous stop; the real one comes from the attraction network (#49)
function travel(activityId: number) {
  const minutes = 5 + ((activityId * 7) % 20);
  return { minutes, mode: minutes <= 10 ? ("walk" as const) : ("taxi" as const) };
}

function tripDays(assignment: AssignmentRecord): TripDay[] {
  return toDays(itineraryOf(assignment)).map((day, index) => ({
    ...day,
    date: addDays(assignment.start_date, index),
    stops: day.stops.map((stop, order) => {
      const visit = visits.find(
        item =>
          item.itinerary_id === assignment.itinerary_id &&
          item.user_id === assignment.user_id &&
          item.activity_id === stop.activity_id,
      );
      return {
        ...stop,
        visit_status: visit?.status ?? null,
        rating: visit?.rating ?? null,
        travel: order === 0 ? null : travel(stop.activity_id),
      };
    }),
  }));
}

function toAssignment(assignment: AssignmentRecord): Assignment {
  const record = itineraryOf(assignment);
  return {
    itinerary_id: record.id,
    package_name: packageOf(record).name,
    guide_name: findUser(record.guide_id)?.name ?? "",
    status: statusOf(assignment),
    start_date: assignment.start_date,
    end_date: endDate(assignment),
    days: record.days.length,
    activity_count: activityCount(record),
    effort: effortCounts(record),
    rating: assignment.rating,
  };
}

function toDetail(assignment: AssignmentRecord): AssignmentDetail {
  return { ...toAssignment(assignment), comment: assignment.comment, trip_days: tripDays(assignment) };
}

// RNF-10: a tourist only reaches their own assignments
function findMine(itineraryId: string, userId: number, ownerId = String(userId)) {
  if (ownerId !== String(userId)) throw new ApiError(403, "Solo puedes cambiar tus propias visitas.");
  const assignment = assignments.find(item => item.itinerary_id === Number(itineraryId) && item.user_id === userId);
  if (!assignment) throw new ApiError(404, "No tienes asignado este itinerario.");
  return assignment;
}

function today(userId: number): Today | null {
  const assignment = assignments.find(item => item.user_id === userId && statusOf(item) === "in_progress");
  if (!assignment) return null;

  const record = itineraryOf(assignment);
  const guide = findUser(record.guide_id);
  const day = Math.round((Date.parse(daysFromToday(0)) - Date.parse(assignment.start_date)) / DAY_MS) + 1;
  const alternative = alternatives.find(item => item.itinerary_id === record.id && item.day === day);

  return {
    itinerary_id: record.id,
    package_name: packageOf(record).name,
    guide: { name: guide?.name ?? "", phone: guide?.phone ?? null, specialty: guide?.specialty ?? null },
    day,
    days: tripDays(assignment),
    alternative: alternative
      ? {
          reason: alternative.reason,
          activity_name: findActivityRecord(alternative.activity_id)?.name ?? "",
          start_time: alternative.start_time,
        }
      : null,
  };
}

function recordVisit(itineraryId: string, ownerId: string, activityId: string, body: VisitRequest, userId: number) {
  const assignment = findMine(itineraryId, userId, ownerId);
  const stop = tripDays(assignment)
    .flatMap(day => day.stops)
    .find(item => item.activity_id === Number(activityId));
  if (!stop) throw new ApiError(404, "La actividad no está en tu itinerario.");

  const index = visits.findIndex(
    item => item.itinerary_id === assignment.itinerary_id && item.user_id === userId && item.activity_id === stop.activity_id,
  );
  if (index >= 0) visits.splice(index, 1);
  // Only a done activity can be rated; status null leaves it pending again
  if (body.status) {
    visits.push({
      itinerary_id: assignment.itinerary_id,
      user_id: userId,
      activity_id: stop.activity_id,
      status: body.status,
      rating: body.status === "done" ? body.rating : null,
    });
  }

  return tripDays(assignment)
    .flatMap(day => day.stops)
    .find(item => item.activity_id === stop.activity_id);
}

function rateTrip(itineraryId: string, ownerId: string, body: TripRatingRequest, userId: number) {
  const assignment = findMine(itineraryId, userId, ownerId);
  if (statusOf(assignment) !== "finished") throw new ApiError(409, "Podrás valorar el viaje cuando termine.");
  if (body.rating < 1 || body.rating > 5) throw new ApiError(422, "La valoración va de 1 a 5.");

  assignment.rating = body.rating;
  assignment.comment = body.comment || null;
  return toDetail(assignment);
}

export const tripRoutes: MockRoute[] = [
  { method: "GET", path: "/me/today", handler: ({ userId }) => today(userId) },
  {
    method: "GET",
    path: "/me/assignments",
    handler: ({ userId }) => assignments.filter(item => item.user_id === userId).map(toAssignment),
  },
  { method: "GET", path: "/me/assignments/:id", handler: ({ params, userId }) => toDetail(findMine(params.id, userId)) },
  {
    method: "PUT",
    path: "/assignments/:itineraryId/:userId/visits/:activityId",
    handler: ({ params, body, userId }) =>
      recordVisit(params.itineraryId, params.userId, params.activityId, body as VisitRequest, userId),
  },
  {
    method: "PATCH",
    path: "/assignments/:itineraryId/:userId",
    handler: ({ params, body, userId }) => rateTrip(params.itineraryId, params.userId, body as TripRatingRequest, userId),
  },
];

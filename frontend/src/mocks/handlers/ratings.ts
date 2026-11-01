import { ApiError } from "@/lib/api/client";
import type { ActivityRating, MyActivityRating, TripRatings } from "@/lib/api/ratings";
import { findActivityRecord } from "../data/activities";
import { assignments, visits } from "../data/assignments";
import type { AssignmentRecord } from "../data/assignments";
import { itineraries } from "../data/itineraries";
import { authorizations, findUser } from "../data/users";
import type { MockRoute } from "../types";
import { packageOf } from "./itineraries";
import { addDays, endDate, statusOf } from "./trips";

function itineraryOf(assignment: AssignmentRecord) {
  const record = itineraries.find(item => item.id === assignment.itinerary_id);
  if (!record) throw new ApiError(404, "El itinerario no existe.");
  return record;
}

// The day of the trip the activity was on, so the visit gets its date
function visitDate(assignment: AssignmentRecord, activityId: number) {
  const index = itineraryOf(assignment).days.findIndex(day => day.stops.some(([id]) => id === activityId));
  return addDays(assignment.start_date, Math.max(index, 0));
}

function ratedVisits(assignment: AssignmentRecord) {
  return visits.filter(
    item =>
      item.itinerary_id === assignment.itinerary_id &&
      item.user_id === assignment.user_id &&
      item.status === "done" &&
      item.rating !== null,
  );
}

// RNF-10: a guide sees the packages where they hold a permission or guide an itinerary
function guidePackages(userId: number) {
  return new Set([
    ...authorizations.filter(item => item.guide_id === userId).map(item => item.package_id),
    ...itineraries.filter(item => item.guide_id === userId).map(item => item.package_id),
  ]);
}

function guideRatings(userId: number): ActivityRating[] {
  if (findUser(userId)?.role !== "guide") throw new ApiError(403, "Solo los guías ven las valoraciones de sus actividades.");
  const packageIds = guidePackages(userId);

  return assignments.flatMap(assignment => {
    const pkg = packageOf(itineraryOf(assignment));
    if (!packageIds.has(pkg.id)) return [];

    return ratedVisits(assignment).flatMap(visit => {
      const activity = findActivityRecord(visit.activity_id);
      if (!activity) return [];
      return [
        {
          id: `${visit.itinerary_id}-${visit.user_id}-${visit.activity_id}`,
          visit_date: visitDate(assignment, visit.activity_id),
          tourist_name: findUser(visit.user_id)?.name ?? "",
          package_id: pkg.id,
          package_name: pkg.name,
          itinerary_id: visit.itinerary_id,
          activity_id: activity.id,
          activity_name: activity.name,
          effort_level: activity.effort_level,
          rating: visit.rating as number,
          comment: visit.comment ?? null,
          is_mine: activity.user_id === userId,
        },
      ];
    });
  });
}

function myRatings(userId: number): TripRatings[] {
  if (findUser(userId)?.role !== "tourist") throw new ApiError(403, "Solo los turistas tienen valoraciones propias.");

  return assignments
    .filter(item => item.user_id === userId && statusOf(item) !== "assigned")
    .sort((a, b) => b.start_date.localeCompare(a.start_date))
    .map(assignment => {
      const activities = ratedVisits(assignment).flatMap((visit): MyActivityRating[] => {
        const activity = findActivityRecord(visit.activity_id);
        if (!activity) return [];
        return [
          {
            activity_id: activity.id,
            activity_name: activity.name,
            effort_level: activity.effort_level,
            rating: visit.rating as number,
            comment: visit.comment ?? null,
          },
        ];
      });
      const status = statusOf(assignment);
      const total = activities.reduce((sum, item) => sum + item.rating, 0);

      return {
        itinerary_id: assignment.itinerary_id,
        package_name: packageOf(itineraryOf(assignment)).name,
        status,
        start_date: assignment.start_date,
        end_date: endDate(assignment),
        overall: status === "finished" && activities.length > 0 ? total / activities.length : null,
        activities,
      };
    });
}

export const ratingRoutes: MockRoute[] = [
  { method: "GET", path: "/ratings", handler: ({ userId }) => guideRatings(userId) },
  { method: "GET", path: "/me/ratings", handler: ({ userId }) => myRatings(userId) },
];

import { ApiError } from "@/lib/api/client";
import type { AssignRequest, AssignResult } from "@/lib/api/assignments";
import { assignments } from "../data/assignments";
import { bookings, isActive } from "../data/bookings";
import { itineraries } from "../data/itineraries";
import { findUser } from "../data/users";
import type { MockRoute } from "../types";
import { packageOf } from "./itineraries";

function assign(itineraryId: string, body: AssignRequest, userId: number): AssignResult {
  if (findUser(userId)?.role !== "admin") throw new ApiError(403, "Solo el administrador asigna itinerarios.");

  const record = itineraries.find(item => item.id === Number(itineraryId));
  if (!record) throw new ApiError(404, "El itinerario no existe.");
  if (record.status !== "approved") throw new ApiError(409, "Solo se asignan itinerarios aprobados.");
  const pkg = packageOf(record);
  // RN-09: an unvalidated package takes no assignments
  if (pkg.status !== "approved") throw new ApiError(409, "El paquete todavía no está validado.");

  const userIds = [...new Set(body.user_ids ?? [])];
  if (userIds.length === 0) throw new ApiError(422, "Elige al menos un turista.");
  if (!body.start_date) throw new ApiError(422, "Indica la fecha de inicio.");
  if (userIds.some(id => findUser(id)?.role !== "tourist")) throw new ApiError(404, "Algún turista no existe.");

  // RN-04: nobody gets two itineraries of the same package
  const doubled = userIds.filter(id =>
    bookings.some(item => item.tourist_id === id && item.package_id === pkg.id && item.status === "assigned"),
  );
  if (doubled.length > 0) {
    const names = doubled.map(id => findUser(id)?.name).join(", ");
    const verb = doubled.length === 1 ? "ya tiene" : "ya tienen";
    throw new ApiError(409, `${names} ${verb} un itinerario de ${pkg.name}.`);
  }

  const today = new Date().toISOString().slice(0, 10);
  for (const id of userIds) {
    // Assigning resolves the tourist's pending booking, or enrols them if they had none
    const booking = bookings.find(item => item.tourist_id === id && item.package_id === pkg.id);
    if (!booking || !isActive(booking)) pkg.enrolled += 1;
    const assigned = { status: "assigned" as const, itinerary_id: record.id, resolved_date: today, rejection_reason: null };
    if (booking) Object.assign(booking, assigned);
    else {
      bookings.push({
        tourist_id: id,
        package_id: pkg.id,
        booking_date: today,
        requested_start_date: null,
        preferred_itinerary_id: null,
        ...assigned,
      });
    }
    assignments.push({ itinerary_id: record.id, user_id: id, start_date: body.start_date, rating: null, comment: null });
  }
  record.assigned = true;

  return { itinerary_id: record.id, user_ids: userIds };
}

export const assignmentRoutes: MockRoute[] = [
  {
    method: "POST",
    path: "/itineraries/:id/assignments",
    handler: ({ params, body, userId }) => assign(params.id, body as AssignRequest, userId),
  },
];

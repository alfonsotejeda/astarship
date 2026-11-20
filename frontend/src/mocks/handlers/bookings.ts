import { ApiError } from "@/lib/api/client";
import type { Booking, BookingStatus } from "@/lib/api/bookings";
import { bookings, isActive } from "../data/bookings";
import type { BookingRecord } from "../data/bookings";
import { itineraries } from "../data/itineraries";
import { findPackage } from "../data/packages";
import { findUser } from "../data/users";
import type { MockRoute } from "../types";

interface BookingBody {
  tourist_id?: number;
  requested_start_date?: string;
  preferred_itinerary_id?: number | null;
}

interface BookingPatch {
  status?: BookingStatus;
  rejection_reason?: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function role(userId: number) {
  return findUser(userId)?.role;
}

export function toBooking(record: BookingRecord): Booking {
  return {
    ...record,
    tourist_name: findUser(record.tourist_id)?.name ?? "",
    package_name: findPackage(record.package_id)?.name ?? "",
  };
}

export function findBooking(packageId: number, touristId: number) {
  return bookings.find(item => item.package_id === packageId && item.tourist_id === touristId);
}

function requirePackage(packageId: string) {
  const pkg = findPackage(Number(packageId));
  if (!pkg) throw new ApiError(404, "Package not found");
  return pkg;
}

// The admin enrols a tourist (P-19); a tourist books for themselves from the catalog
function book(packageId: string, body: BookingBody, userId: number) {
  const pkg = requirePackage(packageId);
  const isAdmin = role(userId) === "admin";
  if (!isAdmin && role(userId) !== "tourist") throw new ApiError(403, "Solo los turistas reservan paquetes.");

  const touristId = isAdmin ? Number(body.tourist_id) : userId;
  if (role(touristId) !== "tourist") throw new ApiError(404, "Tourist not found");
  // RN-09
  if (pkg.status !== "approved") throw new ApiError(409, `«${pkg.name}» no está validado y no admite inscripciones.`);

  const existing = findBooking(pkg.id, touristId);
  if (existing && isActive(existing)) {
    throw new ApiError(
      409,
      isAdmin
        ? "El turista ya está inscrito en ese paquete."
        : existing.status === "assigned"
          ? `Ya tienes un itinerario de «${pkg.name}».`
          : `Ya pediste «${pkg.name}»: está pendiente de asignación.`,
    );
  }

  let requested: string | null = null;
  let preferred: number | null = null;
  if (!isAdmin) {
    if (!body.requested_start_date || body.requested_start_date < today()) {
      throw new ApiError(422, "Elige una fecha de inicio a partir de hoy.");
    }
    requested = body.requested_start_date;
    preferred = body.preferred_itinerary_id ?? null;
    const valid = itineraries.some(item => item.id === preferred && item.package_id === pkg.id && item.status === "approved");
    if (preferred !== null && !valid) throw new ApiError(422, "El itinerario preferido no es de este paquete.");
  }

  const values: BookingRecord = {
    tourist_id: touristId,
    package_id: pkg.id,
    booking_date: today(),
    status: "pending",
    requested_start_date: requested,
    preferred_itinerary_id: preferred,
    itinerary_id: null,
    rejection_reason: null,
    resolved_date: null,
  };
  // A rejected or cancelled booking is booked again in place: there is one per tourist and package
  const record = existing ? Object.assign(existing, values) : values;
  if (!existing) bookings.push(record);
  pkg.enrolled += 1;
  return toBooking(record);
}

function update(params: Record<string, string>, body: BookingPatch, userId: number) {
  const pkg = requirePackage(params.id);
  const touristId = Number(params.touristId);
  const record = findBooking(pkg.id, touristId);
  if (!record) throw new ApiError(404, "Booking not found");
  if (record.status !== "pending") throw new ApiError(409, "Solo se puede cambiar una reserva pendiente.");

  if (body.status === "cancelled") {
    if (userId !== touristId) throw new ApiError(403, "Solo el turista cancela su reserva.");
  } else if (body.status === "rejected") {
    if (role(userId) !== "admin") throw new ApiError(403, "Solo el administrador rechaza reservas.");
    if (!body.rejection_reason?.trim()) throw new ApiError(422, "Escribe el motivo del rechazo.");
    record.rejection_reason = body.rejection_reason.trim();
  } else {
    throw new ApiError(422, "Estado no admitido.");
  }

  record.status = body.status;
  record.resolved_date = today();
  pkg.enrolled -= 1;
  return toBooking(record);
}

function remove(params: Record<string, string>, userId: number) {
  if (role(userId) !== "admin") throw new ApiError(403, "Solo el administrador gestiona inscripciones.");
  const pkg = requirePackage(params.id);
  const index = bookings.findIndex(item => item.package_id === pkg.id && item.tourist_id === Number(params.touristId));
  if (index < 0) throw new ApiError(404, "Booking not found");
  if (bookings[index].itinerary_id !== null) {
    throw new ApiError(409, `Tiene un itinerario asignado en «${pkg.name}»: quita antes la asignación.`);
  }

  if (isActive(bookings[index])) pkg.enrolled -= 1;
  bookings.splice(index, 1);
  return undefined;
}

function byDate(a: BookingRecord, b: BookingRecord) {
  return a.booking_date.localeCompare(b.booking_date);
}

export const bookingRoutes: MockRoute[] = [
  {
    method: "POST",
    path: "/packages/:id/bookings",
    handler: ({ params, body, userId }) => book(params.id, body as BookingBody, userId),
  },
  {
    method: "PATCH",
    path: "/packages/:id/bookings/:touristId",
    handler: ({ params, body, userId }) => update(params, body as BookingPatch, userId),
  },
  {
    method: "DELETE",
    path: "/packages/:id/bookings/:touristId",
    handler: ({ params, userId }) => remove(params, userId),
  },
  {
    method: "GET",
    path: "/me/bookings",
    handler: ({ userId }) =>
      bookings
        .filter(item => item.tourist_id === userId)
        .sort((a, b) => byDate(b, a))
        .map(toBooking),
  },
  {
    method: "GET",
    path: "/bookings",
    handler: ({ query, userId }) => {
      if (role(userId) !== "admin") throw new ApiError(403, "Solo el administrador ve todas las reservas.");
      const status = query.get("status");
      // Oldest first: the queue is served in order
      return bookings
        .filter(item => !status || item.status === status)
        .sort(byDate)
        .map(toBooking);
    },
  },
];

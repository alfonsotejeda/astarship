import type { BookingStatus } from "@/lib/api/bookings";

// Booking (Tourist —To Book— Package), extended as in revision-frontend.md §1
export interface BookingRecord {
  tourist_id: number;
  package_id: number;
  booking_date: string;
  status: BookingStatus;
  requested_start_date: string | null;
  preferred_itinerary_id: number | null;
  // The itinerary assigned there, once the admin assigns one
  itinerary_id: number | null;
  rejection_reason: string | null;
  resolved_date: string | null;
}

// Enrolled by the admin: no requested date or preference
function enrolled(tourist_id: number, package_id: number, itinerary_id: number | null, booking_date: string): BookingRecord {
  return {
    tourist_id,
    package_id,
    booking_date,
    status: itinerary_id === null ? "pending" : "assigned",
    requested_start_date: null,
    preferred_itinerary_id: null,
    itinerary_id,
    rejection_reason: null,
    resolved_date: itinerary_id === null ? null : booking_date,
  };
}

export const bookings: BookingRecord[] = [
  enrolled(6, 1, 142, "2026-09-20"),
  enrolled(6, 2, 148, "2026-09-28"),
  enrolled(6, 3, 133, "2026-09-05"),
  enrolled(7, 1, 142, "2026-09-20"),
  enrolled(7, 2, null, "2026-10-02"),
  enrolled(8, 1, 142, "2026-09-20"),
  enrolled(9, 1, 142, "2026-09-20"),
  enrolled(10, 1, null, "2026-10-04"),
  enrolled(11, 1, 142, "2026-09-20"),
  enrolled(11, 3, null, "2026-10-06"),
  enrolled(12, 1, 128, "2026-09-12"),
  enrolled(13, 2, null, "2026-10-08"),
  enrolled(14, 2, null, "2026-10-08"),
  enrolled(15, 3, 133, "2026-09-05"),
  // Chosen by the tourists from the catalog
  {
    tourist_id: 12,
    package_id: 3,
    booking_date: "2026-10-28",
    status: "pending",
    requested_start_date: "2026-11-24",
    preferred_itinerary_id: 121,
    itinerary_id: null,
    rejection_reason: null,
    resolved_date: null,
  },
  // The demo tourist can book it again from the catalog
  {
    tourist_id: 6,
    package_id: 5,
    booking_date: "2026-10-20",
    status: "rejected",
    requested_start_date: "2026-11-05",
    preferred_itinerary_id: 160,
    itinerary_id: null,
    rejection_reason: "No hay guía disponible esa semana. A partir del 20 de noviembre sí hay plazas.",
    resolved_date: "2026-10-22",
  },
];

// Pending and assigned bookings count as enrolments; rejected and cancelled ones are history
export function isActive(booking: BookingRecord) {
  return booking.status === "pending" || booking.status === "assigned";
}

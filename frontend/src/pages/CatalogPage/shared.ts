import type { Status } from "@/components/StatusPill/StatusPill";
import type { Booking, BookingStatus } from "@/lib/api/bookings";

// How a package stands for the tourist; cancelled ones can simply be picked again
export const BOOKING_PILL: Partial<Record<BookingStatus, { status: Status; label: string }>> = {
  pending: { status: "solicitada", label: "Pendiente de asignación" },
  assigned: { status: "asignado", label: "Ya lo tienes" },
  rejected: { status: "denegada", label: "No asignado" },
};

export function bookingFor(bookings: Booking[] | undefined, packageId: number) {
  return bookings?.find(item => item.package_id === packageId);
}

// A package already pending or assigned cannot be picked again (RN-04)
export function canBook(booking: Booking | undefined) {
  return !booking || booking.status === "rejected" || booking.status === "cancelled";
}

export function daysText(min: number, max: number) {
  if (min === max) return min === 1 ? "1 día" : `${min} días`;
  return `${min}–${max} días`;
}

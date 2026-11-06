import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { request } from "./client";

// pending → assigned | rejected | cancelled (revision-frontend.md §1)
export type BookingStatus = "pending" | "assigned" | "rejected" | "cancelled";

// Booking (Tourist —To Book— Package): one per tourist and package
export interface Booking {
  tourist_id: number;
  tourist_name: string;
  package_id: number;
  package_name: string;
  booking_date: string;
  status: BookingStatus;
  // What the tourist asked for; null when the admin enrolled them
  requested_start_date: string | null;
  preferred_itinerary_id: number | null;
  // Set once the admin assigns one
  itinerary_id: number | null;
  rejection_reason: string | null;
  // When it was assigned, rejected or cancelled
  resolved_date: string | null;
}

export interface BookingRequest {
  requested_start_date: string;
  preferred_itinerary_id: number | null;
}

// 409 if the package is already pending or assigned for the tourist
export function bookPackage(packageId: number, body: BookingRequest) {
  return request<Booking>(`/packages/${packageId}/bookings`, "POST", body);
}

export function getMyBookings() {
  return request<Booking[]>("/me/bookings");
}

// Only the admin sees everyone's
export function getPendingBookings() {
  return request<Booking[]>("/bookings?status=pending");
}

export function cancelBooking(packageId: number, touristId: number) {
  return request<Booking>(`/packages/${packageId}/bookings/${touristId}`, "PATCH", { status: "cancelled" });
}

export function rejectBooking(packageId: number, touristId: number, reason: string) {
  return request<Booking>(`/packages/${packageId}/bookings/${touristId}`, "PATCH", {
    status: "rejected",
    rejection_reason: reason,
  });
}

export function useMyBookings(enabled = true) {
  return useQuery({ queryKey: ["me", "bookings"], queryFn: getMyBookings, enabled });
}

export function usePendingBookings(enabled = true) {
  return useQuery({ queryKey: ["bookings", { status: "pending" }], queryFn: getPendingBookings, enabled });
}

export function useBookPackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ packageId, ...body }: BookingRequest & { packageId: number }) => bookPackage(packageId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useCancelBooking(touristId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (packageId: number) => cancelBooking(packageId, touristId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "bookings"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useRejectBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ packageId, touristId, reason }: { packageId: number; touristId: number; reason: string }) =>
      rejectBooking(packageId, touristId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

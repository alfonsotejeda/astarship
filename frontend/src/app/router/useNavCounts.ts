import type { User } from "@/app/providers/auth/roles";
import { useMyBookings, usePendingBookings } from "@/lib/api/bookings";
import { useItineraries } from "@/lib/api/itineraries";
import { useModificationRequests } from "@/lib/api/requests";
import { reviewQueue } from "@/lib/itinerary";
import { resolvedBookingKeys, resolvedRequestKeys, useSeen } from "@/lib/seen";

// What each role has waiting, by nav key; it takes the place of a notification system
export function useNavCounts(user: User | null, enabled = true): Record<string, number> {
  const role = enabled ? user?.role : undefined;
  const userId = user?.id ?? 0;

  const pendingBookings = usePendingBookings(role === "admin");
  const itineraries = useItineraries(role === "manager");
  const requests = useModificationRequests(role === "guide" || role === "tourist");
  const bookings = useMyBookings(role === "tourist");
  const seenRequests = useSeen(userId, "requests");
  const seenBookings = useSeen(userId, "bookings");

  if (role === "admin") return { assignments: pendingBookings.data?.length ?? 0 };
  if (role === "manager") return { itineraries: itineraries.data ? reviewQueue(itineraries.data).length : 0 };
  // The guide counts the requests nobody has started to handle
  if (role === "guide") return { requests: requests.data?.filter(item => item.status === "requested").length ?? 0 };
  if (role === "tourist") {
    return {
      requests: resolvedRequestKeys(requests.data ?? []).filter(key => !seenRequests.has(key)).length,
      itineraries: resolvedBookingKeys(bookings.data ?? []).filter(key => !seenBookings.has(key)).length,
    };
  }
  return {};
}

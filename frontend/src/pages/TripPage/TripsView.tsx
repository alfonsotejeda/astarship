import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { useCurrentUser } from "@/app/providers/auth/AuthContext";
import { Alert } from "@/components/Alert/Alert";
import { Button } from "@/components/Button/Button";
import { Dialog } from "@/components/Dialog/Dialog";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { ItineraryCard } from "@/components/ItineraryCard/ItineraryCard";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { useCancelBooking, useMyBookings } from "@/lib/api/bookings";
import type { Booking } from "@/lib/api/bookings";
import { useMyAssignments } from "@/lib/api/trips";
import type { AssignmentStatus } from "@/lib/api/trips";
import { formatDate, formatDateRange, formatItineraryCode } from "@/lib/format";
import { toEffortCount } from "@/lib/itinerary";
import { markSeen, resolvedBookingKeys } from "@/lib/seen";
import { ASSIGNMENT_STATUS } from "@/lib/trip";
import { TripActions } from "./shared";

const TRIP_GROUPS: { status: AssignmentStatus; title: string }[] = [
  { status: "in_progress", title: "En curso" },
  { status: "assigned", title: "Próximos" },
  { status: "finished", title: "Anteriores" },
];

export function TripsView() {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const assignments = useMyAssignments();
  const bookings = useMyBookings();
  const cancelBooking = useCancelBooking(user.id);
  const [cancelling, setCancelling] = useState<Booking | null>(null);

  // Opening the page clears the menu count of assigned and rejected bookings
  useEffect(() => {
    if (bookings.data) markSeen(user.id, "bookings", resolvedBookingKeys(bookings.data));
  }, [bookings.data, user.id]);

  const header = (
    <PageHeader
      title="Mis itinerarios"
      subtitle="Los paquetes que pediste y los itinerarios que te asignaron en cada uno."
      actions={
        <Button icon="compass" onClick={() => navigate("/catalog")}>
          Explorar el catálogo
        </Button>
      }
    />
  );

  if (assignments.isPending || bookings.isPending) {
    return (
      <>
        {header}
        <LoadingPanel rows={4} />
      </>
    );
  }

  const failed = [assignments, bookings].find(query => query.isError);
  if (failed || !assignments.data || !bookings.data) {
    return (
      <>
        {header}
        <LoadError
          title="No se pudieron cargar tus itinerarios"
          error={failed?.error ?? null}
          onRetry={() => [assignments, bookings].forEach(query => query.refetch())}
        />
      </>
    );
  }

  const pending = bookings.data.filter(item => item.status === "pending");
  const rejected = bookings.data.filter(item => item.status === "rejected");

  if (assignments.data.length === 0 && pending.length === 0 && rejected.length === 0) {
    return (
      <>
        {header}
        <Panel>
          <EmptyState
            icon="route"
            title="Todavía no tienes itinerarios"
            action={
              <Button variant="primary" icon="compass" onClick={() => navigate("/catalog")}>
                Explorar el catálogo
              </Button>
            }
          >
            Elige un paquete en el catálogo. Cuando te asignen un itinerario aparecerá aquí.
          </EmptyState>
        </Panel>
      </>
    );
  }

  function confirmCancel() {
    if (!cancelling) return;
    cancelBooking.mutate(cancelling.package_id, { onSettled: () => setCancelling(null) });
  }

  return (
    <>
      {header}

      {cancelBooking.isError && (
        <Alert tone="bad" title="No se pudo cancelar" onDismiss={() => cancelBooking.reset()}>
          {cancelBooking.error.message}
        </Alert>
      )}

      {pending.length > 0 && (
        <section className="trip__group" aria-labelledby="trip-group-pending">
          <h2 id="trip-group-pending" className="trip__eyebrow">
            Pendientes de asignación
          </h2>
          <div className="trip__cards">
            {pending.map(booking => (
              <BookingCard
                key={booking.package_id}
                booking={booking}
                actions={
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setCancelling(booking)}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={() => navigate(`/catalog/${booking.package_id}`)}>
                      Ver paquete
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        </section>
      )}

      {TRIP_GROUPS.map(group => {
        const items = assignments.data
          .filter(item => item.status === group.status)
          .sort((a, b) =>
            group.status === "finished" ? b.start_date.localeCompare(a.start_date) : a.start_date.localeCompare(b.start_date),
          );
        if (items.length === 0) return null;

        return (
          <section key={group.status} className="trip__group" aria-labelledby={`trip-group-${group.status}`}>
            <h2 id={`trip-group-${group.status}`} className="trip__eyebrow">
              {group.title}
            </h2>
            <div className="trip__cards">
              {items.map(item => (
                <ItineraryCard
                  key={item.itinerary_id}
                  itinerary={{
                    id: formatItineraryCode(item.itinerary_id),
                    package: item.package_name,
                    status: ASSIGNMENT_STATUS[item.status],
                    creator: `Guía ${item.guide_name}`,
                    days: item.days,
                    activities: item.activity_count,
                    effort: toEffortCount(item.effort),
                  }}
                  onClick={() => navigate(`/trip/itineraries/${item.itinerary_id}`)}
                  actions={
                    <div className="trip__card-actions">
                      <span className="trip__mono trip__muted">{formatDateRange(item.start_date, item.end_date)}</span>
                      <TripActions assignment={item} />
                    </div>
                  }
                />
              ))}
            </div>
          </section>
        );
      })}

      {rejected.length > 0 && (
        <section className="trip__group" aria-labelledby="trip-group-rejected">
          <h2 id="trip-group-rejected" className="trip__eyebrow">
            No asignados
          </h2>
          <div className="trip__cards">
            {rejected.map(booking => (
              <BookingCard
                key={booking.package_id}
                booking={booking}
                actions={
                  <Button size="sm" onClick={() => navigate(`/catalog/${booking.package_id}`)}>
                    Volver a pedirlo
                  </Button>
                }
              />
            ))}
          </div>
        </section>
      )}

      {cancelling && (
        <Dialog
          open
          title={`¿Cancelar «${cancelling.package_name}»?`}
          onClose={() => setCancelling(null)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setCancelling(null)}>
                Mantenerlo
              </Button>
              <Button variant="danger" disabled={cancelBooking.isPending} onClick={confirmCancel}>
                {cancelBooking.isPending ? "Cancelando…" : "Cancelar la petición"}
              </Button>
            </>
          }
        >
          <p className="trip__text">
            El administrador dejará de verlo en sus pendientes. Podrás volver a pedirlo desde el catálogo.
          </p>
        </Dialog>
      )}
    </>
  );
}

function BookingCard({ booking, actions }: { booking: Booking; actions: ReactNode }) {
  const isRejected = booking.status === "rejected";
  const details = [
    `Pedido el ${formatDate(booking.booking_date)}`,
    booking.requested_start_date && `para empezar el ${formatDate(booking.requested_start_date)}`,
    booking.preferred_itinerary_id !== null && `prefieres ${formatItineraryCode(booking.preferred_itinerary_id)}`,
  ].filter(Boolean);

  return (
    <article className="trip__booking">
      <div className="trip__booking-head">
        <span className="trip__strong">{booking.package_name}</span>
        <StatusPill status={isRejected ? "denegada" : "solicitada"}>
          {isRejected ? "No asignado" : "Pendiente de asignación"}
        </StatusPill>
      </div>
      <span className="trip__muted">{details.join(" · ")}</span>
      {isRejected && booking.rejection_reason && <p className="trip__quote">«{booking.rejection_reason}»</p>}
      <div className="trip__booking-actions">{actions}</div>
    </article>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Alert } from "@/components/Alert/Alert";
import { AttractionMap } from "@/components/AttractionMap/AttractionMap";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { EffortChart } from "@/components/EffortChart/EffortChart";
import { EffortSplit } from "@/components/ItineraryCard/EffortSplit";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Rating } from "@/components/Rating/Rating";
import { RouteMapPanel } from "@/components/RouteMapPanel/RouteMapPanel";
import { RouteTimeline } from "@/components/RouteTimeline/RouteTimeline";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { Tabs } from "@/components/Tabs/Tabs";
import { useMyBookings } from "@/lib/api/bookings";
import type { Booking } from "@/lib/api/bookings";
import { useCatalogPackage } from "@/lib/api/catalog";
import type { CatalogItinerary, CatalogPackageDetail } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/client";
import { attractionPoint, attractionsText } from "@/lib/attraction";
import { formatDate, formatItineraryCode } from "@/lib/format";
import { maxDayEffort, toEffortCount, toStops } from "@/lib/itinerary";
import { BookingDialog } from "./BookingDialog";
import { BOOKING_PILL, bookingFor, canBook, daysText } from "./shared";

const BREADCRUMB = { label: "Catálogo", to: "/catalog" };

export function PackageDetail({ id }: { id: number }) {
  const navigate = useNavigate();
  const pkg = useCatalogPackage(id);
  const bookings = useMyBookings();

  if (pkg.isPending) {
    return (
      <>
        <PageHeader title="Paquete" breadcrumbs={[BREADCRUMB, { label: "…" }]} />
        <LoadingPanel rows={8} />
      </>
    );
  }

  if (pkg.isError) {
    const notFound = pkg.error instanceof ApiError && pkg.error.status === 404;
    return (
      <>
        <PageHeader title="Paquete" breadcrumbs={[BREADCRUMB, { label: "No disponible" }]} />
        {notFound ? (
          <Panel>
            <EmptyState
              icon="compass"
              title="Este paquete no está disponible"
              action={<Button onClick={() => navigate("/catalog")}>Ver el catálogo</Button>}
            />
          </Panel>
        ) : (
          <LoadError title="No se pudo cargar el paquete" error={pkg.error} onRetry={() => pkg.refetch()} />
        )}
      </>
    );
  }

  return <DetailContent pkg={pkg.data} booking={bookingFor(bookings.data, id)} bookingsLoaded={bookings.isSuccess} />;
}

type DetailContentProps = {
  pkg: CatalogPackageDetail;
  booking?: Booking;
  bookingsLoaded: boolean;
};

function DetailContent({ pkg, booking, bookingsLoaded }: DetailContentProps) {
  const [itineraryId, setItineraryId] = useState(String(pkg.itineraries[0]?.id ?? ""));
  const [isBooking, setIsBooking] = useState(false);
  const [booked, setBooked] = useState(false);

  const itinerary = pkg.itineraries.find(item => String(item.id) === itineraryId) ?? pkg.itineraries[0];
  const pill = booking && BOOKING_PILL[booking.status];
  // Wait for the bookings, so a package already asked for never offers the button
  const bookable = bookingsLoaded && canBook(booking);

  return (
    <>
      <PageHeader
        title={pkg.name}
        subtitle={`${pkg.destination} · ${pkg.itinerary_count === 1 ? "1 itinerario" : `${pkg.itinerary_count} itinerarios`} · ${daysText(pkg.min_days, pkg.max_days)} · ${attractionsText(pkg.attraction_count)}`}
        breadcrumbs={[BREADCRUMB, { label: pkg.name }]}
        status={pill && <StatusPill status={pill.status}>{pill.label}</StatusPill>}
        actions={
          bookable && (
            <Button variant="primary" icon="check" onClick={() => setIsBooking(true)}>
              Seleccionar paquete
            </Button>
          )
        }
      />

      {booked && booking?.status === "pending" && (
        <Alert tone="ok" title="Paquete pedido" onDismiss={() => setBooked(false)}>
          La agencia te asignará un itinerario. Lo verás en <Link to="/trip/itineraries">Mis itinerarios</Link>.
        </Alert>
      )}
      <BookingAlert booking={booking} hidden={booked} />

      <div className="catalog__columns">
        <div className="catalog__main">
          {itinerary ? (
            <>
              <Panel title="Itinerarios" subtitle="Cada uno es una forma de recorrer el paquete. Al elegirlo puedes marcar el que prefieres.">
                {pkg.itineraries.length > 1 && (
                  <Tabs
                    label="Itinerarios del paquete"
                    items={pkg.itineraries.map(item => ({
                      key: String(item.id),
                      label: `${formatItineraryCode(item.id)} · ${item.days.length === 1 ? "1 día" : `${item.days.length} días`}`,
                    }))}
                    value={String(itinerary.id)}
                    onChange={setItineraryId}
                  />
                )}
                <ItinerarySummary itinerary={itinerary} />
              </Panel>

              <ItineraryDays key={itinerary.id} itinerary={itinerary} />
              <RouteMapPanel key={`map-${itinerary.id}`} days={itinerary.days} attractions={pkg.attractions} />
              <EffortChart days={itinerary.days} subtitle="Cuántas actividades de cada nivel de esfuerzo hay cada día" />
            </>
          ) : (
            <Panel>
              <EmptyState icon="route" title="Este paquete todavía no tiene itinerarios" />
            </Panel>
          )}
        </div>

        <div className="catalog__side">
          <Panel title="Qué cubre">
            <div className="catalog__badges">
              {pkg.categories.map(category => (
                <Badge key={category.id} tone="category">
                  {category.name}
                </Badge>
              ))}
            </div>
            {pkg.rating !== null ? (
              <div className="catalog__rating">
                <Rating value={pkg.rating} showValue label="Valoración de quienes ya viajaron" />
                <span className="catalog__muted">de quienes ya viajaron</span>
              </div>
            ) : (
              <span className="catalog__muted">Todavía nadie lo ha valorado.</span>
            )}
          </Panel>

          <Panel title="Atracciones" subtitle="Por donde pasan sus itinerarios." flush>
            <AttractionMap
              points={pkg.attractions.map(item => attractionPoint(item, true))}
              label={`Atracciones de ${pkg.name}`}
              height={240}
              className="catalog__map"
            />
            <ul className="catalog__attractions">
              {pkg.attractions.map(item => (
                <li key={item.id}>
                  <Link to={`/attractions/${item.id}`} className="catalog__link">
                    {item.name}
                  </Link>
                  <span className="catalog__muted">{item.address}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {isBooking && (
        <BookingDialog
          pkg={pkg}
          initialItineraryId={itinerary?.id ?? null}
          onBooked={() => {
            setIsBooking(false);
            setBooked(true);
          }}
          onClose={() => setIsBooking(false)}
        />
      )}
    </>
  );
}

// Why the button is missing, or what happened last time
function BookingAlert({ booking, hidden }: { booking?: Booking; hidden: boolean }) {
  if (!booking || hidden) return null;

  if (booking.status === "pending") {
    return (
      <Alert tone="info" title="Ya lo pediste">
        El {formatDate(booking.booking_date)}. Está pendiente de que la agencia te asigne un itinerario; puedes
        cancelarlo desde <Link to="/trip/itineraries">Mis itinerarios</Link>.
      </Alert>
    );
  }
  if (booking.status === "assigned") {
    return (
      <Alert tone="ok" title="Ya tienes un itinerario de este paquete">
        Nadie puede tener dos itinerarios del mismo paquete.{" "}
        {booking.itinerary_id !== null && (
          <Link to={`/trip/itineraries/${booking.itinerary_id}`}>Ver {formatItineraryCode(booking.itinerary_id)}</Link>
        )}
      </Alert>
    );
  }
  if (booking.status === "rejected") {
    return (
      <Alert tone="warn" title="La última vez no se pudo asignar">
        {booking.rejection_reason ?? "La agencia no pudo asignarte un itinerario."} Puedes volver a pedirlo.
      </Alert>
    );
  }
  return null;
}

function ItinerarySummary({ itinerary }: { itinerary: CatalogItinerary }) {
  return (
    <dl className="catalog__facts">
      <div className="catalog__fact">
        <dt className="catalog__eyebrow">Guía</dt>
        <dd>{itinerary.guide_name}</dd>
      </div>
      <div className="catalog__fact">
        <dt className="catalog__eyebrow">Actividades</dt>
        <dd>
          {itinerary.activity_count} en {itinerary.days.length === 1 ? "1 día" : `${itinerary.days.length} días`}
        </dd>
      </div>
      <div className="catalog__fact">
        <dt className="catalog__eyebrow">Esfuerzo B · M · A</dt>
        <dd>
          <EffortSplit effort={toEffortCount(itinerary.effort)} />
        </dd>
      </div>
      <div className="catalog__fact">
        <dt className="catalog__eyebrow">Valoración</dt>
        <dd>
          {itinerary.rating !== null ? (
            <Rating value={itinerary.rating} showValue label="Valoración del itinerario" />
          ) : (
            <span className="catalog__muted">Sin valorar</span>
          )}
        </dd>
      </div>
    </dl>
  );
}

// The days of a template itinerary: their dates depend on when it is assigned, so only the number is shown
function ItineraryDays({ itinerary }: { itinerary: CatalogItinerary }) {
  const [day, setDay] = useState(String(itinerary.days[0]?.day ?? ""));
  const current = itinerary.days.find(item => String(item.day) === day) ?? itinerary.days[0];
  const maxEffort = maxDayEffort(itinerary.days);

  return (
    <Panel title="Recorrido" subtitle="Pulsa una atracción para ver su ficha.">
      {itinerary.days.length > 1 && (
        <Tabs
          label="Días"
          items={itinerary.days.map(item => ({ key: String(item.day), label: `Día ${item.day}` }))}
          value={current ? String(current.day) : undefined}
          onChange={setDay}
        />
      )}
      {current && <RouteTimeline stops={toStops(current)} maxEffort={maxEffort} label={`Día ${current.day}`} />}
    </Panel>
  );
}

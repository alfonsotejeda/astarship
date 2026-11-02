import { useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/Badge/Badge";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { Icon } from "@/components/Icon/Icon";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Rating } from "@/components/Rating/Rating";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { useMyBookings } from "@/lib/api/bookings";
import type { Booking } from "@/lib/api/bookings";
import { useCatalog } from "@/lib/api/catalog";
import type { CatalogPackage } from "@/lib/api/catalog";
import { attractionsText } from "@/lib/attraction";
import { BOOKING_PILL, bookingFor, daysText } from "./shared";

const HEADER = (
  <PageHeader
    title="Catálogo"
    subtitle="Los paquetes que ofrece la agencia. Entra en uno para ver sus itinerarios y sus atracciones, y elígelo si te interesa."
  />
);

function packagesText(count: number) {
  return count === 1 ? "1 paquete" : `${count} paquetes`;
}

export function PackageList() {
  const catalog = useCatalog();
  const bookings = useMyBookings();
  const [query, setQuery] = useState("");
  const [destination, setDestination] = useState("");

  if (catalog.isPending) {
    return (
      <>
        {HEADER}
        <LoadingPanel rows={6} />
      </>
    );
  }

  if (catalog.isError) {
    return (
      <>
        {HEADER}
        <LoadError title="No se pudo cargar el catálogo" error={catalog.error} onRetry={() => catalog.refetch()} />
      </>
    );
  }

  if (catalog.data.length === 0) {
    return (
      <>
        {HEADER}
        <Panel>
          <EmptyState icon="compass" title="Todavía no hay paquetes disponibles">
            Cuando la agencia publique uno con itinerarios aprobados aparecerá aquí.
          </EmptyState>
        </Panel>
      </>
    );
  }

  const destinations = [...new Set(catalog.data.map(item => item.destination))].sort((a, b) => a.localeCompare(b, "es"));
  const text = query.trim().toLowerCase();
  const shown = catalog.data.filter(
    item =>
      (!destination || item.destination === destination) &&
      (!text ||
        item.name.toLowerCase().includes(text) ||
        item.categories.some(category => category.name.toLowerCase().includes(text))),
  );

  return (
    <>
      {HEADER}

      <FilterBar
        summary={packagesText(shown.length)}
        onReset={() => {
          setQuery("");
          setDestination("");
        }}
      >
        <Field
          id="catalog-query"
          label="Buscar"
          placeholder="Paquete o categoría"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <Field
          id="catalog-destination"
          label="Destino"
          options={[{ value: "", label: "Todos" }, ...destinations]}
          value={destination}
          onChange={event => setDestination(event.target.value)}
        />
      </FilterBar>

      {shown.length === 0 ? (
        <Panel>
          <EmptyState icon="search" title="Ningún paquete coincide con la búsqueda" />
        </Panel>
      ) : (
        <div className="catalog__grid">
          {shown.map(item => (
            <PackageCard key={item.id} pkg={item} booking={bookingFor(bookings.data, item.id)} />
          ))}
        </div>
      )}
    </>
  );
}

function PackageCard({ pkg, booking }: { pkg: CatalogPackage; booking?: Booking }) {
  const pill = booking && BOOKING_PILL[booking.status];

  return (
    <article className="catalog__card">
      <div className="catalog__card-head">
        <span className="catalog__destination">
          <Icon name="pin" size={14} />
          {pkg.destination}
        </span>
        {pill && <StatusPill status={pill.status}>{pill.label}</StatusPill>}
      </div>

      {/* The link covers the whole card, as in ItineraryCard */}
      <Link to={`/catalog/${pkg.id}`} className="catalog__card-title">
        {pkg.name}
      </Link>

      <div className="catalog__badges">
        {pkg.categories.map(category => (
          <Badge key={category.id} tone="category">
            {category.name}
          </Badge>
        ))}
      </div>

      <div className="catalog__meta">
        <span>{pkg.itinerary_count === 1 ? "1 itinerario" : `${pkg.itinerary_count} itinerarios`}</span>
        <span>{daysText(pkg.min_days, pkg.max_days)}</span>
        <span>{attractionsText(pkg.attraction_count)}</span>
      </div>

      <div className="catalog__card-foot">
        {pkg.rating !== null ? (
          <Rating value={pkg.rating} showValue label="Valoración de quienes ya viajaron" />
        ) : (
          <span className="catalog__muted">Todavía sin valoraciones</span>
        )}
      </div>
    </article>
  );
}

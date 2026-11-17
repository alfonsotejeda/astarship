import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Rating } from "@/components/Rating/Rating";
import { StatTile } from "@/components/StatTile/StatTile";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { effortLabel } from "@/lib/activity";
import { toEffortLevel } from "@/lib/api/activities";
import { useMyRatings } from "@/lib/api/ratings";
import type { MyActivityRating, TripRatings } from "@/lib/api/ratings";
import { formatDateRange, formatDecimal, formatItineraryCode } from "@/lib/format";
import { average, StatsSkeleton } from "./shared";

const TOURIST_HEADER = <PageHeader title="Mis valoraciones" subtitle="Todo lo que has valorado, agrupado por paquete." />;

export function TouristView() {
  const trips = useMyRatings();

  if (trips.isPending) {
    return (
      <>
        {TOURIST_HEADER}
        <StatsSkeleton count={3} />
        <LoadingPanel rows={4} />
      </>
    );
  }

  if (trips.isError) {
    return (
      <>
        {TOURIST_HEADER}
        <LoadError title="No se pudieron cargar tus valoraciones" error={trips.error} onRetry={() => trips.refetch()} />
      </>
    );
  }

  if (trips.data.length === 0) {
    return (
      <>
        {TOURIST_HEADER}
        <Panel>
          <EmptyState icon="star" title="Todavía no has valorado nada">
            Cuando empiece tu viaje podrás valorar cada actividad desde Hoy.
          </EmptyState>
        </Panel>
      </>
    );
  }

  const rated = trips.data.flatMap(trip => trip.activities);
  const mean = average(rated.map(item => item.rating));

  return (
    <>
      {TOURIST_HEADER}

      <div className="ratings__stats ratings__stats--compact">
        <StatTile label="Paquetes recibidos" value={trips.data.length} />
        <StatTile
          label="Valoración media"
          value={mean === null ? "—" : formatDecimal(mean)}
          unit={mean === null ? undefined : "/ 5"}
        />
        <StatTile label="Actividades valoradas" value={rated.length} />
      </div>

      {trips.data.map(trip => (
        <TripTable key={trip.itinerary_id} trip={trip} />
      ))}
    </>
  );
}

function TripTable({ trip }: { trip: TripRatings }) {
  const isPhone = useMediaQuery("(max-width: 480px)");
  const range = formatDateRange(trip.start_date, trip.end_date);
  const code = formatItineraryCode(trip.itinerary_id);

  const columns: Column<MyActivityRating>[] = [
    {
      key: "activity_name",
      label: "Actividad",
      render: row => <span className="ratings__strong">{row.activity_name}</span>,
    },
    {
      key: "effort_level",
      label: "Esfuerzo",
      render: row => <EffortMeter level={toEffortLevel(row.effort_level)} showLabel={!isPhone} />,
      exportValue: row => effortLabel(row.effort_level),
    },
    {
      key: "rating",
      label: "Valoración",
      render: row => <Rating value={row.rating} label={`${row.rating} de 5`} />,
      exportValue: row => `${row.rating} / 5`,
    },
  ];
  // The artboard drops the comment on phones so the table fits
  if (!isPhone) {
    columns.push({
      key: "comment",
      label: "Comentario",
      sortable: false,
      render: row => <span className="ratings__muted">{row.comment || "—"}</span>,
      exportValue: row => row.comment || "—",
    });
  }

  return (
    <section className="ratings__trip" aria-label={trip.package_name}>
      <div className="ratings__overall">
        <span className="ratings__muted">Valoración del viaje</span>
        {trip.overall !== null ? (
          <Rating value={trip.overall} showValue label="Valoración del viaje" />
        ) : (
          <span className="ratings__muted">
            {trip.status === "finished" ? "Sin actividades valoradas" : "Podrás valorarlo al terminar el viaje"}
          </span>
        )}
      </div>
      <DataTable
        title={trip.package_name}
        subtitle={trip.status === "in_progress" ? `${code} · en curso · ${range}` : `${code} · ${range}`}
        columns={columns}
        rows={trip.activities}
        rowKey="activity_id"
        defaultSort={{ key: "rating", dir: "desc" }}
        exportable
        emptyText="Aún no has valorado ninguna actividad de este viaje."
      />
    </section>
  );
}

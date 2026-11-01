import { useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE } from "@/app/providers/auth/roles";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Rating } from "@/components/Rating/Rating";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { StatTile } from "@/components/StatTile/StatTile";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { toEffortLevel } from "@/lib/api/activities";
import { useMyRatings, useRatings } from "@/lib/api/ratings";
import type { ActivityRating, MyActivityRating, TripRatings } from "@/lib/api/ratings";
import { formatDateRange, formatDecimal, formatItineraryCode, formatShortDate } from "@/lib/format";
import "./RatingsPage.css";

export function RatingsPage() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "guide") return <GuideView />;
  if (user.role === "tourist") return <TouristView />;
  return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
}

const EFFORT_LABEL = { bajo: "Bajo", medio: "Medio", alto: "Alto" };

const EFFORT_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "1", label: "Bajo" },
  { value: "2", label: "Medio" },
  { value: "3", label: "Alto" },
];

const RATING_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "high", label: "4 o más" },
  { value: "low", label: "2 o menos" },
];

function average(values: number[]) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function effortText(level: number) {
  return EFFORT_LABEL[toEffortLevel(level)];
}

function StatsSkeleton({ count }: { count: number }) {
  return (
    <div className="ratings__stats" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={96} />
      ))}
    </div>
  );
}

const GUIDE_HEADER = (
  <PageHeader title="Valoraciones" subtitle="Lo que opinan los turistas de las actividades de tus paquetes." />
);

function GuideView() {
  const ratings = useRatings();

  if (ratings.isPending) {
    return (
      <>
        {GUIDE_HEADER}
        <StatsSkeleton count={4} />
        <LoadingPanel rows={6} />
      </>
    );
  }

  if (ratings.isError) {
    return (
      <>
        {GUIDE_HEADER}
        <LoadError title="No se pudieron cargar las valoraciones" error={ratings.error} onRetry={() => ratings.refetch()} />
      </>
    );
  }

  return <GuideContent ratings={ratings.data} />;
}

type ActivityMean = { name: string; effort: number; mean: number };

// Best and worst are per activity, from the mean of its ratings
function activityMeans(rows: ActivityRating[]): ActivityMean[] {
  const byActivity = new Map<number, ActivityRating[]>();
  for (const row of rows) byActivity.set(row.activity_id, [...(byActivity.get(row.activity_id) ?? []), row]);

  return [...byActivity.values()].map(items => ({
    name: items[0].activity_name,
    effort: items[0].effort_level,
    mean: average(items.map(item => item.rating)) ?? 0,
  }));
}

function GuideContent({ ratings }: { ratings: ActivityRating[] }) {
  const [packageId, setPackageId] = useState("");
  const [effort, setEffort] = useState("");
  const [minRating, setMinRating] = useState("");
  const [onlyMine, setOnlyMine] = useState(true);

  const packages = [...new Map(ratings.map(item => [item.package_id, item.package_name])).entries()];
  const rows = ratings.filter(
    item =>
      (!onlyMine || item.is_mine) &&
      (!packageId || String(item.package_id) === packageId) &&
      (!effort || String(item.effort_level) === effort) &&
      (minRating !== "high" || item.rating >= 4) &&
      (minRating !== "low" || item.rating <= 2),
  );

  const means = activityMeans(rows).sort((a, b) => b.mean - a.mean);
  const best = means[0];
  const worst = means.length > 1 ? means[means.length - 1] : undefined;
  const mean = average(rows.map(item => item.rating));
  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = rows.filter(item => item.visit_date.startsWith(month)).length;
  const packageName = packages.find(([id]) => String(id) === packageId)?.[1];

  function resetFilters() {
    setPackageId("");
    setEffort("");
    setMinRating("");
    setOnlyMine(true);
  }

  const columns: Column<ActivityRating>[] = [
    {
      key: "visit_date",
      label: "Fecha",
      render: row => <span className="ratings__mono">{formatShortDate(row.visit_date)}</span>,
      exportValue: row => formatShortDate(row.visit_date),
    },
    { key: "tourist_name", label: "Turista" },
    { key: "package_name", label: "Paquete" },
    {
      key: "activity_name",
      label: "Actividad",
      render: row => <span className="ratings__strong">{row.activity_name}</span>,
    },
    {
      key: "effort_level",
      label: "Esfuerzo",
      render: row => <EffortMeter level={toEffortLevel(row.effort_level)} />,
      exportValue: row => effortText(row.effort_level),
    },
    {
      key: "rating",
      label: "Valoración",
      render: row => <Rating value={row.rating} label={`${row.rating} de 5`} />,
      exportValue: row => `${row.rating} / 5`,
    },
    {
      key: "comment",
      label: "Comentario",
      sortable: false,
      render: row => <span className="ratings__muted">{row.comment || "—"}</span>,
      exportValue: row => row.comment || "—",
    },
  ];

  return (
    <>
      {GUIDE_HEADER}

      <FilterBar
        summary={rows.length === 1 ? "1 valoración" : `${rows.length} valoraciones`}
        onReset={resetFilters}
      >
        <Field
          id="ratings-package"
          label="Paquete"
          options={[
            { value: "", label: "Todos mis paquetes" },
            ...packages.map(([id, name]) => ({ value: String(id), label: name })),
          ]}
          value={packageId}
          onChange={event => setPackageId(event.target.value)}
        />
        <Field
          id="ratings-effort"
          label="Esfuerzo"
          options={EFFORT_OPTIONS}
          value={effort}
          onChange={event => setEffort(event.target.value)}
        />
        <Field
          id="ratings-min"
          label="Valoración"
          options={RATING_OPTIONS}
          value={minRating}
          onChange={event => setMinRating(event.target.value)}
        />
        <Checkbox
          id="ratings-mine"
          label="Solo mis actividades"
          checked={onlyMine}
          onChange={event => setOnlyMine(event.target.checked)}
        />
      </FilterBar>

      <div className="ratings__stats">
        <StatTile
          label="Valoración media"
          value={mean === null ? "—" : formatDecimal(mean)}
          unit={mean === null ? undefined : "/ 5"}
          note={`De ${onlyMine ? "tus " : ""}${means.length} ${means.length === 1 ? "actividad" : "actividades"}`}
        />
        <StatTile
          label="Mejor valorada"
          value={best ? formatDecimal(best.mean) : "—"}
          unit={best ? "/ 5" : undefined}
          note={best?.name}
        />
        <StatTile
          label="Peor valorada"
          value={worst ? formatDecimal(worst.mean) : "—"}
          unit={worst ? "/ 5" : undefined}
          note={worst && `${worst.name} · esfuerzo ${effortText(worst.effort).toLowerCase()}`}
          noteTone={worst ? "bad" : undefined}
        />
        <StatTile label="Valoraciones este mes" value={thisMonth} />
      </div>

      <DataTable
        title="Valoraciones de actividades"
        subtitle={`${onlyMine ? "Solo mis actividades" : "Todas las actividades"} · ${packageName ?? "todos los paquetes"}`}
        columns={columns}
        rows={rows}
        defaultSort={{ key: "visit_date", dir: "desc" }}
        exportable
        emptyText={
          ratings.length === 0
            ? "Todavía no hay valoraciones de las actividades de tus paquetes."
            : "No hay valoraciones con estos filtros."
        }
      />
    </>
  );
}

const TOURIST_HEADER = <PageHeader title="Mis valoraciones" subtitle="Todo lo que has valorado, agrupado por paquete." />;

function TouristView() {
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
      exportValue: row => effortText(row.effort_level),
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

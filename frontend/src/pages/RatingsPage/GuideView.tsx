import { useState } from "react";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Rating } from "@/components/Rating/Rating";
import { StatTile } from "@/components/StatTile/StatTile";
import { EFFORT_OPTIONS, effortLabel } from "@/lib/activity";
import { toEffortLevel } from "@/lib/api/activities";
import { useRatings } from "@/lib/api/ratings";
import type { ActivityRating } from "@/lib/api/ratings";
import { formatDecimal, formatShortDate } from "@/lib/format";
import { average, StatsSkeleton } from "./shared";

const RATING_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "high", label: "4 o más" },
  { value: "low", label: "2 o menos" },
];

const GUIDE_HEADER = (
  <PageHeader title="Valoraciones" subtitle="Lo que opinan los turistas de las actividades de tus paquetes." />
);

export function GuideView() {
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
      exportValue: row => effortLabel(row.effort_level),
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
          options={[{ value: "", label: "Todos" }, ...EFFORT_OPTIONS]}
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
          note={worst && `${worst.name} · esfuerzo ${effortLabel(worst.effort).toLowerCase()}`}
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

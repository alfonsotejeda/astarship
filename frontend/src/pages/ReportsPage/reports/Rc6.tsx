import { Fragment, useState } from "react";
import type { ReactNode } from "react";
import type { ChartDatum, ChartSeries } from "@/components/ChartPanel/ChartPanel";
import { ChartPanel } from "@/components/ChartPanel/ChartPanel";
import type { Column } from "@/components/DataTable/DataTable";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { StatTile } from "@/components/StatTile/StatTile";
import { usePackages } from "@/lib/api/packages";
import { useRc6Report } from "@/lib/api/reports";
import type { Rc6AbandonmentRow, Rc6Filters, Rc6RequesterRow, Rc6Trend } from "@/lib/api/reports";
import { formatDate, formatDateRange, formatDecimal } from "@/lib/format";
import { exportReportPdf } from "@/lib/pdf";
import { ReportHeader, reportTable } from "../ReportTemplate";
import type { ReportTable } from "../ReportTemplate";

const NO_FILTERS: Rc6Filters = { package_id: "", date_from: "", date_to: "" };

const EFFORT_ORDER: Record<EffortLevel, number> = { bajo: 1, medio: 2, alto: 3 };
const EFFORT_LABEL: Record<EffortLevel, string> = { bajo: "Bajo", medio: "Medio", alto: "Alto" };

const PACKAGE_COLORS = ["destination", "origin", "workshop", "route", "effort-low", "effort-medium"];

const EFFORT_SERIES: ChartSeries[] = [
  { key: "bajo", label: "Bajo", color: "effort-low" },
  { key: "medio", label: "Medio", color: "effort-medium" },
  { key: "alto", label: "Alto", color: "effort-high" },
];

const X_TICKS = [
  { value: 1, label: "Bajo" },
  { value: 2, label: "Medio" },
  { value: 3, label: "Alto" },
];

function rangeText({ date_from, date_to }: Rc6Filters) {
  if (date_from && date_to) return formatDateRange(date_from, date_to);
  if (date_from) return `Desde el ${formatDate(date_from)}`;
  if (date_to) return `Hasta el ${formatDate(date_to)}`;
  return "Todas las fechas";
}

function percentText(value: number) {
  return `${formatDecimal(value)} %`;
}

function ratingText(value: number | null) {
  return value === null ? "—" : `${formatDecimal(value)} / 5`;
}

function differenceText(value: number | null) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${formatDecimal(value)}`;
}

function differenceClass(value: number | null) {
  if (value === null) return "reports__muted";
  const classes = ["reports__mono"];
  if (value > 0) classes.push("reports__positive");
  if (value < 0) classes.push("reports__negative");
  return classes.join(" ");
}

function correlationNote(correlation: number | null) {
  if (correlation === null) return "Sin datos suficientes";
  if (correlation <= -0.3) return "A más esfuerzo, menor valoración";
  if (correlation >= 0.3) return "A más esfuerzo, mayor valoración";
  return "Sin relación clara";
}

function correlationTone(correlation: number | null): "ok" | "warn" | undefined {
  if (correlation === null) return undefined;
  if (correlation <= -0.3) return "warn";
  if (correlation >= 0.3) return "ok";
  return undefined;
}

// ChartPanel takes plain records; this keeps its table view in Spanish decimals
function ratingColumn(key: string, label: string): Column<ChartDatum> {
  return {
    key,
    label,
    align: "right",
    render: row => {
      const value = row[key];
      return typeof value === "number" ? (
        <span className="reports__mono">{formatDecimal(value)}</span>
      ) : (
        <span className="reports__muted">—</span>
      );
    },
    sortValue: row => {
      const value = row[key];
      return typeof value === "number" ? value : -1;
    },
    exportValue: row => {
      const value = row[key];
      return typeof value === "number" ? formatDecimal(value) : "—";
    },
  };
}

function trendPoints(trend: Rc6Trend): [{ x: number; y: number }, { x: number; y: number }] {
  return [
    { x: trend.from[0], y: trend.from[1] },
    { x: trend.to[0], y: trend.to[1] },
  ];
}

const ABANDONMENT_COLUMNS: Column<Rc6AbandonmentRow>[] = [
  { key: "activity_name", label: "Actividad" },
  { key: "guide_name", label: "Guía creador" },
  { key: "package_name", label: "Paquete" },
  {
    key: "effort",
    label: "Esfuerzo",
    render: row => <EffortMeter level={row.effort} />,
    sortValue: row => EFFORT_ORDER[row.effort],
    exportValue: row => EFFORT_LABEL[row.effort],
  },
  { key: "visits", label: "Visitas", align: "right" },
  { key: "skipped", label: "Abandonos", align: "right" },
  {
    key: "abandonment",
    label: "Tasa de abandono",
    align: "right",
    render: row => <span className="reports__mono">{percentText(row.abandonment)}</span>,
    exportValue: row => percentText(row.abandonment),
  },
];

const REQUESTER_COLUMNS: Column<Rc6RequesterRow>[] = [
  { key: "tourist_name", label: "Turista" },
  { key: "group_name", label: "Grupo de viaje" },
  { key: "package_name", label: "Paquete" },
  { key: "requests", label: "Solicitudes", align: "right" },
  {
    key: "rating",
    label: "Valoración propia",
    align: "right",
    render: row => (
      <span className={row.rating === null ? "reports__muted" : "reports__mono"}>{ratingText(row.rating)}</span>
    ),
    sortValue: row => row.rating ?? -1,
    exportValue: row => ratingText(row.rating),
  },
  {
    key: "group_rating",
    label: "Promedio del grupo",
    align: "right",
    render: row => (
      <span className={row.group_rating === null ? "reports__muted" : "reports__mono"}>
        {ratingText(row.group_rating)}
      </span>
    ),
    sortValue: row => row.group_rating ?? -1,
    exportValue: row => ratingText(row.group_rating),
  },
  {
    key: "difference",
    label: "Diferencia",
    align: "right",
    render: row => <span className={differenceClass(row.difference)}>{differenceText(row.difference)}</span>,
    sortValue: row => row.difference ?? -99,
    exportValue: row => differenceText(row.difference),
  },
];

// RC-6: effort ↔ rating dispersion, average rating by package, abandonment and requesters
export function Rc6() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const report = useRc6Report(filters);
  const packages = usePackages();

  const data = report.data;
  const summary = data?.summary;
  const scatter = data?.scatter ?? [];
  const packagePoints = data?.package_chart ?? [];
  const abandonmentRows = data?.abandonment ?? [];
  const requesterRows = data?.requesters ?? [];
  const effortSummary = data?.effort_summary ?? [];
  const trend = data?.trend ?? null;

  const packageOptions = [
    { value: "", label: "Todos los paquetes" },
    ...(packages.data ?? []).map(pkg => ({ value: String(pkg.id), label: pkg.name })),
  ];
  const packageLabel =
    packageOptions.find(option => option.value === filters.package_id)?.label ?? "Todos los paquetes";
  const range = rangeText(filters);
  const filterLabel = `${packageLabel} · ${range}`;
  const isReady = !report.isPending && !report.error;

  const scatterPackages = [...new Map(scatter.map(point => [point.package_id, point.package_name])).entries()];
  const scatterSeries: ChartSeries[] = scatterPackages.map(([id, name], index) => ({
    key: `package-${id}`,
    label: name,
    color: PACKAGE_COLORS[index % PACKAGE_COLORS.length],
  }));
  const scatterData: ChartDatum[] = scatter.map(point => ({
    x: point.effort_value,
    y: point.rating,
    series: `package-${point.package_id}`,
    name: `${point.package_name} · ${EFFORT_LABEL[point.effort]}`,
  }));
  const scatterRows: ChartDatum[] = scatter.map((point, index) => ({
    id: index,
    package: point.package_name,
    effort: EFFORT_LABEL[point.effort],
    rating: point.rating,
    visits: point.visits,
    rated: point.rated,
  }));
  const scatterTableColumns: Column<ChartDatum>[] = [
    { key: "package", label: "Paquete" },
    { key: "effort", label: "Esfuerzo" },
    ratingColumn("rating", "Valoración"),
    { key: "visits", label: "Visitas", align: "right" },
    { key: "rated", label: "Valoradas", align: "right" },
  ];

  const packageData: ChartDatum[] = packagePoints.map(point => ({
    package: point.package_name,
    bajo: point.bajo ?? undefined,
    medio: point.medio ?? undefined,
    alto: point.alto ?? undefined,
  }));
  const packageTableColumns: Column<ChartDatum>[] = [
    { key: "package", label: "Paquete" },
    ratingColumn("bajo", "Bajo"),
    ratingColumn("medio", "Medio"),
    ratingColumn("alto", "Alto"),
  ];

  const effortText = effortSummary
    .flatMap(item => (item.rating === null ? [] : [`${item.label}: ${formatDecimal(item.rating)}`]))
    .join(" · ");

  const tables: ReportTable[] = data
    ? [
        reportTable({
          title: "Top 10 de actividades por abandono",
          subtitle: filterLabel,
          columns: ABANDONMENT_COLUMNS,
          rows: abandonmentRows,
          defaultSort: { key: "abandonment", dir: "desc" },
          emptyText: "No hay visitas registradas para calcular el abandono.",
        }),
        reportTable({
          title: "Solicitantes frente a su grupo",
          subtitle: filterLabel,
          columns: REQUESTER_COLUMNS,
          rows: requesterRows,
          defaultSort: { key: "difference", dir: "desc" },
          emptyText: "No hay solicitudes de modificación con estos filtros.",
        }),
      ]
    : [];

  function setFilter(key: keyof Rc6Filters, value: string) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  function handleExport() {
    if (tables.length === 0) return;
    exportReportPdf({
      title: "Esfuerzo y valoración",
      filter: filterLabel,
      tables: tables.map(table => table.pdf),
    });
  }

  let content: ReactNode;
  if (report.isPending) {
    content = (
      <>
        <div className="reports__stats" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} height={96} />
          ))}
        </div>
        <LoadingPanel rows={6} />
      </>
    );
  } else if (report.error) {
    content = (
      <LoadError
        title="No se pudo cargar el reporte"
        error={report.error}
        onRetry={() => report.refetch()}
      />
    );
  } else {
    content = (
      <>
        <div className="reports__stats">
          <StatTile
            label="Valoración media"
            value={summary?.rating == null ? "—" : formatDecimal(summary.rating)}
            unit={summary?.rating == null ? undefined : "/ 5"}
            note={`${summary?.rated ?? 0} valoraciones`}
          />
          <StatTile
            label="Correlación de Pearson"
            value={trend?.correlation == null ? "—" : formatDecimal(trend.correlation, 2)}
            note={correlationNote(trend?.correlation ?? null)}
            noteTone={correlationTone(trend?.correlation ?? null)}
          />
          <StatTile
            label="Tasa de abandono"
            value={formatDecimal(summary?.abandonment ?? 0)}
            unit="%"
            note={`${summary?.skipped ?? 0} de ${summary?.visits ?? 0} visitas`}
            noteTone="bad"
          />
          <StatTile
            label="Turistas con solicitud"
            value={summary?.requesters ?? 0}
            note={
              (summary?.requests ?? 0) > 0
                ? `${summary?.requests ?? 0} solicitudes en el período`
                : "Sin solicitudes en el período"
            }
          />
        </div>

        {/* P-27 has its own layout: the dispersion is wider than the per-package bars */}
        <div className="reports__rc6-charts">
          <ChartPanel
            exportable
            title="Esfuerzo y valoración"
            subtitle={filterLabel}
            kind="scatter"
            data={scatterData}
            series={scatterSeries}
            xLabel="Esfuerzo"
            yLabel="Valoración media"
            xDomain={[0.5, 3.5]}
            xTicks={X_TICKS}
            yDomain={[0, 5]}
            yFormat={value => formatDecimal(value)}
            trend={trend ? trendPoints(trend) : undefined}
            tableColumns={scatterTableColumns}
            tableRows={scatterRows}
            footnote={
              scatter.length === 0
                ? "No hay valoraciones con estos filtros."
                : `${effortText ? `Promedio por esfuerzo: ${effortText}. ` : ""}La línea punteada resume la tendencia entre esfuerzo y valoración.`
            }
          />
          <ChartPanel
            exportable
            title="Valoración media por paquete"
            subtitle={filterLabel}
            kind="grouped"
            data={packageData}
            series={EFFORT_SERIES}
            xKey="package"
            xLabel="Paquete"
            yLabel="Valoración media"
            yMax={5}
            yFormat={value => formatDecimal(value)}
            tableColumns={packageTableColumns}
            tableRows={packageData}
            footnote="Promedio de las valoraciones de las visitas realizadas. Una barra vacía significa que no hay valoraciones en ese nivel."
          />
        </div>

        {tables.map(table => (
          <Fragment key={table.title}>{table.node}</Fragment>
        ))}
      </>
    );
  }

  return (
    <>
      <ReportHeader rc="rc6" onExport={isReady && tables.length > 0 ? handleExport : undefined} />

      <FilterBar
        summary={isReady ? `${summary?.activities ?? 0} actividades · ${summary?.visits ?? 0} visitas` : undefined}
        onReset={() => setFilters(NO_FILTERS)}
      >
        <Field
          id="rc6-package"
          label="Paquete"
          options={packageOptions}
          value={filters.package_id}
          onChange={event => setFilter("package_id", event.target.value)}
        />
        <Field
          id="rc6-from"
          label="Desde"
          type="date"
          value={filters.date_from}
          max={filters.date_to || undefined}
          onChange={event => setFilter("date_from", event.target.value)}
        />
        <Field
          id="rc6-to"
          label="Hasta"
          type="date"
          value={filters.date_to}
          min={filters.date_from || undefined}
          onChange={event => setFilter("date_to", event.target.value)}
        />
      </FilterBar>

      {content}
    </>
  );
}

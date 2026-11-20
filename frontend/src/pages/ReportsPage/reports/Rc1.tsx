import { useState } from "react";
import type { ChartDatum, ChartSeries } from "@/components/ChartPanel/ChartPanel";
import type { Column } from "@/components/DataTable/DataTable";
import { Field } from "@/components/Field/Field";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { usePackages } from "@/lib/api/packages";
import { useRc1Report } from "@/lib/api/reports";
import type { Rc1Filters, Rc1Row } from "@/lib/api/reports";
import { formatDate, formatDateRange, formatItineraryCode } from "@/lib/format";
import { ITINERARY_STATUS, STATUS_LABEL, STATUS_ORDER } from "@/lib/itinerary";
import { reportTable, ReportTemplate } from "../ReportTemplate";

const NO_FILTERS: Rc1Filters = { package_id: "", date_from: "", date_to: "" };

const STATUS_SERIES: ChartSeries[] = [
  { key: "approved", label: "Aprobado", color: "ok" },
  { key: "validated", label: "Validado", color: "info" },
  { key: "pending", label: "Pendiente", color: "warn" },
  { key: "rejected", label: "Rechazado", color: "bad" },
];

function typesText(row: Rc1Row) {
  return row.proportion_types.map(item => `${item.activity_type_name} ${item.value}`).join(" · ");
}

function categoriesText(row: Rc1Row) {
  return row.proportion_categories.map(item => `${item.category_name} ${item.value}`).join(" · ");
}

function rangeText({ date_from, date_to }: Rc1Filters) {
  if (date_from && date_to) return formatDateRange(date_from, date_to);
  if (date_from) return `Desde el ${formatDate(date_from)}`;
  if (date_to) return `Hasta el ${formatDate(date_to)}`;
  return "Todas las fechas";
}

function count(rows: Rc1Row[], ...statuses: Rc1Row["status"][]) {
  return rows.filter(row => statuses.includes(row.status)).length;
}

const COLUMNS: Column<Rc1Row>[] = [
  {
    key: "id",
    label: "Itinerario",
    render: row => <span className="reports__code">{formatItineraryCode(row.id)}</span>,
    exportValue: row => formatItineraryCode(row.id),
  },
  { key: "package_name", label: "Paquete" },
  { key: "creator", label: "Creador" },
  {
    key: "creation_date",
    label: "Creado",
    render: row => <span className="reports__mono">{formatDate(row.creation_date)}</span>,
    exportValue: row => formatDate(row.creation_date),
  },
  {
    key: "proportion_types",
    label: "Proporción por tipo (%)",
    render: row => typesText(row) || <span className="reports__muted">—</span>,
    sortValue: typesText,
    exportValue: typesText,
  },
  { key: "activity_count", label: "Total", align: "right" },
  {
    key: "proportion_categories",
    label: "Categorías (%)",
    render: row => categoriesText(row) || <span className="reports__muted">—</span>,
    sortValue: row => row.proportion_categories.length,
    exportValue: categoriesText,
  },
  {
    key: "status",
    label: "Estado",
    render: row => <StatusPill status={ITINERARY_STATUS[row.status]} />,
    sortValue: row => STATUS_ORDER[row.status],
    exportValue: row => STATUS_LABEL[row.status],
  },
];

// RC-1: itineraries generated for a package, with their creator, date and parameters
export function Rc1() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const packages = usePackages();
  const report = useRc1Report(filters);

  const rows = report.data?.rows ?? [];
  const packageName = packages.data?.find(pkg => String(pkg.id) === filters.package_id)?.name;
  const packageLabel = packageName ?? "Todos los paquetes";
  const approved = count(rows, "approved");

  // One bar per creator, stacked by the status of their itineraries
  const creators = new Map<number, ChartDatum>();
  for (const point of report.data?.chart ?? []) {
    const datum = creators.get(point.guide_id) ?? { label: point.creator };
    creators.set(point.guide_id, { ...datum, [point.status]: point.count });
  }

  function setFilter(key: keyof Rc1Filters, value: string) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  return (
    <ReportTemplate
      rc="rc1"
      filters={
        <>
          <Field
            id="rc1-package"
            label="Paquete"
            options={[
              { value: "", label: "Todos los paquetes" },
              ...(packages.data ?? []).map(pkg => ({ value: String(pkg.id), label: pkg.name })),
            ]}
            value={filters.package_id}
            onChange={event => setFilter("package_id", event.target.value)}
          />
          <Field
            id="rc1-from"
            label="Desde"
            type="date"
            value={filters.date_from}
            max={filters.date_to || undefined}
            onChange={event => setFilter("date_from", event.target.value)}
          />
          <Field
            id="rc1-to"
            label="Hasta"
            type="date"
            value={filters.date_to}
            min={filters.date_from || undefined}
            onChange={event => setFilter("date_to", event.target.value)}
          />
        </>
      }
      summary={rows.length === 1 ? "1 itinerario" : `${rows.length} itinerarios`}
      onReset={() => setFilters(NO_FILTERS)}
      filterLabel={`${packageLabel} · ${rangeText(filters)}`}
      tiles={[
        { label: "Generados", value: rows.length },
        {
          label: "Aprobados",
          value: approved,
          note: rows.length > 0 ? `${Math.round((approved / rows.length) * 100)} % del total` : undefined,
        },
        { label: "Por revisar", value: count(rows, "pending", "validated"), note: "Pendientes o validados" },
        { label: "Rechazados", value: count(rows, "rejected") },
      ]}
      charts={[
        {
          title: "Itinerarios por creador",
          subtitle: "Según su estado actual",
          kind: "stacked",
          xLabel: "Creador",
          series: STATUS_SERIES,
          data: [...creators.values()],
        },
      ]}
      tables={[
        reportTable({
          title: packageName ? `Itinerarios de ${packageName}` : "Itinerarios generados",
          subtitle: rangeText(filters),
          columns: COLUMNS,
          rows,
          defaultSort: { key: "creation_date", dir: "desc" },
        }),
      ]}
      isPending={report.isPending}
      error={report.error}
      onRetry={() => report.refetch()}
    />
  );
}

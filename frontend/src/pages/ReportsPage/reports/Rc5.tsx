import { useState } from "react";
import type { ChartDatum, ChartSeries } from "@/components/ChartPanel/ChartPanel";
import type { Column } from "@/components/DataTable/DataTable";
import { Field } from "@/components/Field/Field";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { useRc5Report } from "@/lib/api/reports";
import type { Rc5Filters, Rc5Row, Rc5Set } from "@/lib/api/reports";
import { formatDate, formatDateRange, formatItineraryCode } from "@/lib/format";
import { reportTable, ReportTemplate } from "../ReportTemplate";

const NO_FILTERS: Rc5Filters = { set: "", date_from: "", date_to: "" };

const SET_OPTIONS: { value: Rc5Set; label: string }[] = [
  { value: "", label: "Todos los itinerarios" },
  { value: "approved", label: "Aprobados" },
  { value: "assigned", label: "Asignados" },
  { value: "validated", label: "Validados" },
  { value: "pending", label: "Pendientes" },
  { value: "rejected", label: "Rechazados" },
];

const TYPE_SERIES: ChartSeries[] = [
  { key: "visita", label: "Visita", color: "destination" },
  { key: "excursion", label: "Excursión", color: "origin" },
  { key: "taller", label: "Taller", color: "workshop" },
];

const EFFORT_SERIES: ChartSeries[] = [
  { key: "bajo", label: "Bajo", color: "effort-low" },
  { key: "medio", label: "Medio", color: "effort-medium" },
  { key: "alto", label: "Alto", color: "effort-high" },
];

function rangeText({ date_from, date_to }: Rc5Filters) {
  if (date_from && date_to) return formatDateRange(date_from, date_to);
  if (date_from) return `Desde el ${formatDate(date_from)}`;
  if (date_to) return `Hasta el ${formatDate(date_to)}`;
  return "Todas las fechas";
}

function proportionText(row: Rc5Row) {
  return `${row.proportion.join(" / ")} %`;
}

function typeText(row: Rc5Row) {
  return row.activity_types.map(item => `${item.activity_type_name}: ${item.count}`).join(" · ");
}

function coverageText(row: Rc5Row) {
  return `${row.covered_categories} de ${row.package_categories}`;
}

function equilibriumText(row: Rc5Row) {
  return row.balanced ? "Cumple" : "No cumple";
}

const COLUMNS: Column<Rc5Row>[] = [
  {
    key: "id",
    label: "Itinerario",
    render: row => <span className="reports__code">{formatItineraryCode(row.id)}</span>,
    exportValue: row => formatItineraryCode(row.id),
  },
  { key: "package_name", label: "Paquete" },
  {
    key: "proportion",
    label: "Reparto",
    render: row => (
      <span className="reports__mono" title={typeText(row)}>
        {proportionText(row)}
      </span>
    ),
    sortValue: proportionText,
    exportValue: proportionText,
  },
  {
    key: "coverage",
    label: "Cobertura",
    align: "right",
    render: row => <span className="reports__mono">{coverageText(row)}</span>,
    sortValue: row => (row.package_categories > 0 ? row.covered_categories / row.package_categories : 0),
    exportValue: coverageText,
  },
  { key: "high_effort", label: "Esfuerzo alto", align: "right" },
  {
    key: "balanced",
    label: "Equilibrio",
    render: row => (
      <StatusPill
        status={row.balanced ? "aprobado" : "rechazado"}
        title={`${row.criteria_met} de ${row.criteria_total} criterios`}
      >
        {equilibriumText(row)}
      </StatusPill>
    ),
    sortValue: row => (row.balanced ? 1 : 0),
    exportValue: equilibriumText,
  },
];

// RC-5: distribution by type and effort of each package, and whether it met the balance criteria
export function Rc5() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const report = useRc5Report(filters);

  const rows = report.data?.rows ?? [];
  const summary = report.data?.summary;
  const total = summary?.itineraries ?? 0;
  const balanced = summary?.balanced ?? 0;
  const balancedShare = total > 0 ? Math.round((balanced / total) * 100) : 0;
  const highEffort = summary?.high_effort ?? 0;
  const highShare = (summary?.activities ?? 0) > 0 ? Math.round((highEffort / (summary?.activities ?? 1)) * 100) : 0;
  const setLabel = SET_OPTIONS.find(option => option.value === filters.set)?.label ?? "Todos los itinerarios";

  // ChartPanel takes plain records; the API shape keeps its own fields for the table
  const typeChart: ChartDatum[] = (report.data?.type_chart ?? []).map(point => ({
    package: point.package_name,
    visita: point.visita,
    excursion: point.excursion,
    taller: point.taller,
  }));
  const effortChart: ChartDatum[] = (report.data?.effort_chart ?? []).map(point => ({
    package: point.package_name,
    bajo: point.bajo,
    medio: point.medio,
    alto: point.alto,
  }));

  function setFilter(key: keyof Rc5Filters, value: string) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  return (
    <ReportTemplate
      rc="rc5"
      filters={
        <>
          <Field
            id="rc5-set"
            label="Conjunto"
            options={SET_OPTIONS}
            value={filters.set}
            onChange={event => setFilter("set", event.target.value)}
          />
          <Field
            id="rc5-from"
            label="Desde"
            type="date"
            value={filters.date_from}
            max={filters.date_to || undefined}
            onChange={event => setFilter("date_from", event.target.value)}
          />
          <Field
            id="rc5-to"
            label="Hasta"
            type="date"
            value={filters.date_to}
            min={filters.date_from || undefined}
            onChange={event => setFilter("date_to", event.target.value)}
          />
        </>
      }
      summary={`${total} ${total === 1 ? "itinerario" : "itinerarios"} · ${summary?.packages ?? 0} ${
        summary?.packages === 1 ? "paquete" : "paquetes"
      }`}
      onReset={() => setFilters(NO_FILTERS)}
      filterLabel={`${setLabel} · ${rangeText(filters)}`}
      tiles={[
        {
          label: "Itinerarios",
          value: total,
          note: `${summary?.activities ?? 0} actividades`,
        },
        {
          label: "Paquetes comparados",
          value: summary?.packages ?? 0,
          note: "Con al menos un itinerario",
        },
        {
          label: "Cumplen equilibrio",
          value: balanced,
          note: total > 0 ? `${balancedShare} % de los itinerarios` : undefined,
          noteTone: total > 0 && balancedShare === 100 ? "ok" : undefined,
        },
        {
          label: "Esfuerzo alto",
          value: highEffort,
          note: (summary?.activities ?? 0) > 0 ? `${highShare} % de las actividades` : undefined,
        },
      ]}
      charts={[
        {
          title: "Actividades por paquete y tipo",
          subtitle: `${setLabel} · ${rangeText(filters)}`,
          kind: "stacked",
          xKey: "package",
          xLabel: "Paquete",
          yLabel: "Actividades",
          series: TYPE_SERIES,
          data: typeChart,
          footnote: "Cada barra suma las actividades de los itinerarios del paquete, según su tipo.",
        },
        {
          title: "Actividades por paquete y esfuerzo",
          subtitle: `${setLabel} · ${rangeText(filters)}`,
          kind: "stacked",
          xKey: "package",
          xLabel: "Paquete",
          yLabel: "Actividades",
          series: EFFORT_SERIES,
          data: effortChart,
          footnote: "Bajo, medio y alto siguen los niveles de esfuerzo de cada actividad.",
        },
      ]}
      tables={[
        reportTable({
          title: "Comparación por itinerario",
          subtitle: `${setLabel} · ${rangeText(filters)}`,
          columns: COLUMNS,
          rows,
          defaultSort: { key: "package_name", dir: "asc" },
          emptyText: "No hay itinerarios con estos filtros.",
        }),
      ]}
      isPending={report.isPending}
      error={report.error}
      onRetry={() => report.refetch()}
    />
  );
}

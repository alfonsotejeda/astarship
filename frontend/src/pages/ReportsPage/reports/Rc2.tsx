import { useState } from "react";
import { Badge } from "@/components/Badge/Badge";
import type { ChartDatum, ChartSeries } from "@/components/ChartPanel/ChartPanel";
import type { Column } from "@/components/DataTable/DataTable";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import { Field } from "@/components/Field/Field";
import { usePackages } from "@/lib/api/packages";
import { useRc2Report } from "@/lib/api/reports";
import type { Rc2Filters, Rc2Row } from "@/lib/api/reports";
import { formatDate, formatDateRange, formatDecimal } from "@/lib/format";
import { reportTable, ReportTemplate } from "../ReportTemplate";

const NO_FILTERS: Rc2Filters = { package_id: "", date_from: "", date_to: "" };

const EFFORT_SERIES: ChartSeries[] = [
  { key: "bajo", label: "Bajo", color: "effort-low" },
  { key: "medio", label: "Medio", color: "effort-medium" },
  { key: "alto", label: "Alto", color: "effort-high" },
];

const EFFORT_ORDER: Record<EffortLevel, number> = { bajo: 1, medio: 2, alto: 3 };
const EFFORT_LABEL: Record<EffortLevel, string> = { bajo: "Bajo", medio: "Medio", alto: "Alto" };

function rangeText({ date_from, date_to }: Rc2Filters) {
  if (date_from && date_to) return formatDateRange(date_from, date_to);
  if (date_from) return `Desde el ${formatDate(date_from)}`;
  if (date_to) return `Hasta el ${formatDate(date_to)}`;
  return "Todas las fechas";
}

function percentText(row: Rc2Row) {
  return `${formatDecimal(row.percentage)} %`;
}

const COLUMNS: Column<Rc2Row>[] = [
  { key: "activity_name", label: "Actividad" },
  { key: "category_name", label: "Categoría" },
  {
    key: "activity_type_code",
    label: "Tipo",
    render: row => <Badge tone={row.activity_type_code}>{row.activity_type_name}</Badge>,
    sortValue: row => row.activity_type_name,
    exportValue: row => row.activity_type_name,
  },
  {
    key: "effort",
    label: "Esfuerzo",
    render: row => <EffortMeter level={row.effort} />,
    sortValue: row => EFFORT_ORDER[row.effort],
    exportValue: row => EFFORT_LABEL[row.effort],
  },
  { key: "uses", label: "Usos", align: "right" },
  {
    key: "percentage",
    label: "%",
    align: "right",
    render: row => <span className="reports__mono">{percentText(row)}</span>,
    exportValue: percentText,
  },
];

// RC-2: activities most used in a package's final itineraries, by effort and category
export function Rc2() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const packages = usePackages();
  const report = useRc2Report(filters);

  const rows = report.data?.rows ?? [];
  // ChartPanel takes plain records; the API shape keeps its own fields for the table
  const chart: ChartDatum[] = (report.data?.chart ?? []).map(point => ({
    category: point.category,
    bajo: point.bajo,
    medio: point.medio,
    alto: point.alto,
  }));
  const summary = report.data?.summary;
  const packageName = packages.data?.find(pkg => String(pkg.id) === filters.package_id)?.name;
  const packageLabel = packageName ?? "Todos los paquetes";
  const totalUses = summary?.total_uses ?? 0;
  const highEffort = summary?.high_effort_uses ?? 0;
  const highShare = totalUses > 0 ? Math.round((highEffort / totalUses) * 100) : 0;

  function setFilter(key: keyof Rc2Filters, value: string) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  return (
    <ReportTemplate
      rc="rc2"
      filters={
        <>
          <Field
            id="rc2-package"
            label="Paquete"
            options={[
              { value: "", label: "Todos los paquetes" },
              ...(packages.data ?? []).map(pkg => ({ value: String(pkg.id), label: pkg.name })),
            ]}
            value={filters.package_id}
            onChange={event => setFilter("package_id", event.target.value)}
          />
          <Field
            id="rc2-from"
            label="Desde"
            type="date"
            value={filters.date_from}
            max={filters.date_to || undefined}
            onChange={event => setFilter("date_from", event.target.value)}
          />
          <Field
            id="rc2-to"
            label="Hasta"
            type="date"
            value={filters.date_to}
            min={filters.date_from || undefined}
            onChange={event => setFilter("date_to", event.target.value)}
          />
        </>
      }
      summary={`${rows.length} ${rows.length === 1 ? "actividad" : "actividades"} · ${totalUses} ${
        totalUses === 1 ? "uso" : "usos"
      }`}
      onReset={() => setFilters(NO_FILTERS)}
      filterLabel={`${packageLabel} · ${rangeText(filters)}`}
      tiles={[
        {
          label: "Itinerarios finales",
          value: summary?.final_itineraries ?? 0,
          note: "Aprobados en el periodo",
        },
        {
          label: "Actividades distintas",
          value: summary?.distinct_activities ?? 0,
          note: "Con al menos un uso",
        },
        { label: "Usos", value: totalUses },
        {
          label: "Esfuerzo alto",
          value: highEffort,
          note: totalUses > 0 ? `${highShare} % de los usos` : undefined,
        },
      ]}
      charts={[
        {
          title: "Actividades por categoría y esfuerzo",
          subtitle: `${packageLabel} · ${rangeText(filters)}`,
          kind: "stacked",
          xKey: "category",
          xLabel: "Categoría",
          yLabel: "Usos",
          series: EFFORT_SERIES,
          data: chart,
        },
      ]}
      tables={[
        reportTable({
          title: packageName ? `Actividades de ${packageName}` : "Actividades más utilizadas",
          subtitle: rangeText(filters),
          columns: COLUMNS,
          rows,
          defaultSort: { key: "uses", dir: "desc" },
          emptyText: "No hay actividades en itinerarios finales con estos filtros.",
        }),
      ]}
      isPending={report.isPending}
      error={report.error}
      onRetry={() => report.refetch()}
    />
  );
}

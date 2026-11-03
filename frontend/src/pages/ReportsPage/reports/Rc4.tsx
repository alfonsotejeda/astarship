import { useState } from "react";
import type { ChartDatum, ChartSeries } from "@/components/ChartPanel/ChartPanel";
import type { Column } from "@/components/DataTable/DataTable";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import { Field } from "@/components/Field/Field";
import { Rating } from "@/components/Rating/Rating";
import { EFFORT_LABEL } from "@/lib/activity";
import { useRc4Report } from "@/lib/api/reports";
import type { Rc4Filters, Rc4Row } from "@/lib/api/reports";
import { formatDecimal, formatItineraryCode } from "@/lib/format";
import { reportTable, ReportTemplate } from "../ReportTemplate";

const NO_FILTERS: Rc4Filters = { itinerary_id: "", group_id: "" };

const EXPERIENCE_SERIES: ChartSeries[] = [
  { key: "satisfaction", label: "Satisfacción", color: "ok" },
  { key: "abandonment", label: "Abandono", color: "bad" },
];

const EFFORT_ORDER: Record<EffortLevel, number> = { bajo: 1, medio: 2, alto: 3 };

function percentText(value: number) {
  return `${formatDecimal(value)} %`;
}

function ratingText(row: Rc4Row) {
  return row.rating === null ? "—" : `${formatDecimal(row.rating)} / 5`;
}

const COLUMNS: Column<Rc4Row>[] = [
  { key: "activity_name", label: "Actividad" },
  {
    key: "effort",
    label: "Esfuerzo",
    render: row => <EffortMeter level={row.effort} />,
    sortValue: row => EFFORT_ORDER[row.effort],
    exportValue: row => EFFORT_LABEL[row.effort],
  },
  { key: "visits", label: "Visitas", align: "right" },
  {
    key: "rating",
    label: "Valoración",
    align: "right",
    render: row =>
      row.rating === null ? (
        <span className="reports__muted">—</span>
      ) : (
        <Rating value={row.rating} showValue label="Valoración media" />
      ),
    sortValue: row => row.rating ?? 0,
    exportValue: ratingText,
  },
  {
    key: "satisfaction",
    label: "Satisfacción",
    align: "right",
    render: row => <span className="reports__mono">{percentText(row.satisfaction)}</span>,
    exportValue: row => percentText(row.satisfaction),
  },
  {
    key: "abandonment",
    label: "Abandono",
    align: "right",
    render: row => <span className="reports__mono">{percentText(row.abandonment)}</span>,
    exportValue: row => percentText(row.abandonment),
  },
];

// RC-4: tourist experience in an itinerary, comparing satisfaction and abandonment by effort
export function Rc4() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const report = useRc4Report(filters);

  const rows = report.data?.rows ?? [];
  const itineraries = report.data?.itineraries ?? [];
  const groups = report.data?.groups ?? [];
  const summary = report.data?.summary;
  const mean = summary?.rating ?? null;
  const chart: ChartDatum[] = (report.data?.chart ?? []).map(point => ({
    label: point.label,
    satisfaction: point.satisfaction,
    abandonment: point.abandonment,
  }));

  const itinerary = itineraries.find(item => String(item.id) === filters.itinerary_id);
  const group = groups.find(item => String(item.id) === filters.group_id);
  const itineraryLabel = itinerary
    ? `${formatItineraryCode(itinerary.id)} · ${itinerary.package_name}`
    : "Todos los itinerarios";
  const groupLabel = group?.name ?? "Todos los grupos";
  const activitiesText = `${rows.length} ${rows.length === 1 ? "actividad" : "actividades"}`;

  function setFilter(key: keyof Rc4Filters, value: string) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  return (
    <ReportTemplate
      rc="rc4"
      filters={
        <>
          <Field
            id="rc4-itinerary"
            label="Itinerario"
            options={[
              { value: "", label: "Todos los itinerarios" },
              ...itineraries.map(item => ({
                value: String(item.id),
                label: `${formatItineraryCode(item.id)} · ${item.package_name}`,
              })),
            ]}
            value={filters.itinerary_id}
            onChange={event => setFilter("itinerary_id", event.target.value)}
          />
          <Field
            id="rc4-group"
            label="Grupo"
            options={[
              { value: "", label: "Todos los grupos" },
              ...groups.map(item => ({ value: String(item.id), label: item.name })),
            ]}
            value={filters.group_id}
            onChange={event => setFilter("group_id", event.target.value)}
          />
        </>
      }
      summary={`${activitiesText} · ${summary?.visits ?? 0} visitas`}
      onReset={() => setFilters(NO_FILTERS)}
      filterLabel={`${itineraryLabel} · ${groupLabel}`}
      tiles={[
        {
          label: "Visitas",
          value: summary?.visits ?? 0,
          note: `${summary?.tourists ?? 0} turistas · ${summary?.completed ?? 0} realizadas`,
        },
        {
          label: "Valoración media",
          value: mean === null ? "—" : formatDecimal(mean),
          unit: mean === null ? undefined : "/ 5",
          note: `${summary?.rated ?? 0} valoraciones`,
        },
        {
          label: "Satisfacción",
          value: formatDecimal(summary?.satisfaction ?? 0),
          unit: "%",
          note: "Valoraciones de 4 o más",
          noteTone: "ok",
        },
        {
          label: "Abandono",
          value: formatDecimal(summary?.abandonment ?? 0),
          unit: "%",
          note: "Visitas no realizadas",
          noteTone: "bad",
        },
      ]}
      charts={[
        {
          title: "Satisfacción y abandono por esfuerzo",
          subtitle: `${itineraryLabel} · ${groupLabel}`,
          kind: "grouped",
          xKey: "label",
          xLabel: "Esfuerzo",
          yLabel: "%",
          yMax: 100,
          yFormat: value => `${formatDecimal(value, 0)} %`,
          series: EXPERIENCE_SERIES,
          data: chart,
          footnote:
            "Satisfacción: visitas con valoración de 4 o más sobre el total. Abandono: visitas no realizadas sobre el total.",
        },
      ]}
      tables={[
        reportTable({
          title: itinerary ? `Experiencia de ${formatItineraryCode(itinerary.id)}` : "Experiencia por actividad",
          subtitle: `${itineraryLabel} · ${groupLabel}`,
          columns: COLUMNS,
          rows,
          defaultSort: { key: "visits", dir: "desc" },
          emptyText: "No hay visitas con estos filtros.",
        }),
      ]}
      isPending={report.isPending}
      error={report.error}
      onRetry={() => report.refetch()}
    />
  );
}

import { useState } from "react";
import type { ChartSeries } from "@/components/ChartPanel/ChartPanel";
import type { Column } from "@/components/DataTable/DataTable";
import { Field } from "@/components/Field/Field";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { useCurrentUser } from "@/app/providers/auth/AuthContext";
import { useRc3Report } from "@/lib/api/reports";
import type { Rc3Filters, Rc3Row } from "@/lib/api/reports";
import { formatDate, formatDateRange, formatItineraryCode } from "@/lib/format";
import { ITINERARY_STATUS, STATUS_LABEL, STATUS_ORDER } from "@/lib/itinerary";
import { reportTable, ReportTemplate } from "../ReportTemplate";

const NO_FILTERS: Rc3Filters = { reviewer_id: "", date_from: "", date_to: "" };

const RESULT_SERIES: ChartSeries[] = [
  { key: "approved", label: "Aprobados", color: "ok" },
  { key: "returned", label: "Devueltos", color: "bad" },
];

// Guide validations only appear when the selected reviewer has any
const VALIDATED_SERIES: ChartSeries = { key: "validated", label: "Validados", color: "info" };

function rangeText({ date_from, date_to }: Rc3Filters) {
  if (date_from && date_to) return formatDateRange(date_from, date_to);
  if (date_from) return `Desde el ${formatDate(date_from)}`;
  if (date_to) return `Hasta el ${formatDate(date_to)}`;
  return "Todas las fechas";
}

function percentText(value: number, total: number) {
  return total > 0 ? `${Math.round((value / total) * 100)} %` : "—";
}

const COLUMNS: Column<Rc3Row>[] = [
  {
    key: "itinerary_id",
    label: "ID",
    render: row => <span className="reports__mono">{formatItineraryCode(row.itinerary_id)}</span>,
    exportValue: row => formatItineraryCode(row.itinerary_id),
  },
  { key: "package_name", label: "Paquete" },
  { key: "guide_name", label: "Creador" },
  {
    key: "review_date",
    label: "Fecha",
    render: row => <span className="reports__mono">{formatDate(row.review_date)}</span>,
    exportValue: row => formatDate(row.review_date),
  },
  {
    key: "result",
    label: "Resultado",
    render: row => <StatusPill status={ITINERARY_STATUS[row.result]} />,
    sortValue: row => STATUS_ORDER[row.result],
    exportValue: row => STATUS_LABEL[row.result],
  },
  {
    key: "observations",
    label: "Observaciones",
    render: row => row.observations || "—",
    exportValue: row => row.observations ?? "",
  },
];

// RC-3: the reviews of one reviewer, with date, result and observations
export function Rc3() {
  const user = useCurrentUser();
  // P-11 «Mis validaciones»: the manager opens the report already filtered by themself
  const [filters, setFilters] = useState<Rc3Filters>(() =>
    user.role === "manager" ? { ...NO_FILTERS, reviewer_id: String(user.id) } : NO_FILTERS,
  );
  const report = useRc3Report(filters);

  const rows = report.data?.rows ?? [];
  const reviewers = report.data?.reviewers ?? [];
  const summary = report.data?.summary;
  const chart = (report.data?.chart ?? []).map(point => ({
    label: point.label,
    approved: point.approved,
    returned: point.returned,
    validated: point.validated,
  }));
  const hasValidated = (report.data?.chart ?? []).some(point => point.validated > 0);
  const series = hasValidated ? [...RESULT_SERIES, VALIDATED_SERIES] : RESULT_SERIES;
  const reviewerName = reviewers.find(reviewer => String(reviewer.id) === filters.reviewer_id)?.name;
  const reviewerLabel = reviewerName ?? "Todos los revisores";
  const decisions = (summary?.approved ?? 0) + (summary?.returned ?? 0);

  function setFilter(key: keyof Rc3Filters, value: string) {
    setFilters(current => ({ ...current, [key]: value }));
  }

  return (
    <ReportTemplate
      rc="rc3"
      filters={
        <>
          <Field
            id="rc3-reviewer"
            label="Revisor"
            options={[
              { value: "", label: "Todos los revisores" },
              ...reviewers.map(reviewer => ({ value: String(reviewer.id), label: reviewer.name })),
            ]}
            value={filters.reviewer_id}
            onChange={event => setFilter("reviewer_id", event.target.value)}
          />
          <Field
            id="rc3-from"
            label="Desde"
            type="date"
            value={filters.date_from}
            max={filters.date_to || undefined}
            onChange={event => setFilter("date_from", event.target.value)}
          />
          <Field
            id="rc3-to"
            label="Hasta"
            type="date"
            value={filters.date_to}
            min={filters.date_from || undefined}
            onChange={event => setFilter("date_to", event.target.value)}
          />
        </>
      }
      summary={`${rows.length} ${rows.length === 1 ? "validación" : "validaciones"}`}
      onReset={() => setFilters(NO_FILTERS)}
      filterLabel={`${reviewerLabel} · ${rangeText(filters)}`}
      tiles={[
        {
          label: "Validaciones",
          value: summary?.validations ?? 0,
          note: "En el periodo",
        },
        {
          label: "Aprobados",
          value: summary?.approved ?? 0,
          note: decisions > 0 ? `${percentText(summary?.approved ?? 0, decisions)} de las decisiones` : "Sin decisiones",
        },
        {
          label: "Devueltos",
          value: summary?.returned ?? 0,
          note: decisions > 0 ? `${percentText(summary?.returned ?? 0, decisions)} de las decisiones` : "Sin decisiones",
        },
        {
          label: "Itinerarios revisados",
          value: summary?.itineraries ?? 0,
          note: "Distintos en el periodo",
        },
      ]}
      charts={[
        {
          title: "Validaciones por mes y resultado",
          subtitle: `${reviewerLabel} · ${rangeText(filters)}`,
          kind: "grouped",
          xKey: "label",
          xLabel: "Mes",
          yLabel: "Validaciones",
          series,
          data: chart,
          footnote: "Cada barra cuenta las validaciones del mes según su resultado.",
        },
      ]}
      tables={[
        reportTable({
          title: reviewerName ? `Validaciones de ${reviewerName}` : "Validaciones por revisor",
          subtitle: rangeText(filters),
          columns: COLUMNS,
          rows,
          defaultSort: { key: "review_date", dir: "desc" },
          emptyText: "No hay validaciones con estos filtros.",
        }),
      ]}
      isPending={report.isPending}
      error={report.error}
      onRetry={() => report.refetch()}
    />
  );
}

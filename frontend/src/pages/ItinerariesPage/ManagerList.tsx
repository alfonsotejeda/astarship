import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/Button/Button";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { ItineraryCard } from "@/components/ItineraryCard/ItineraryCard";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { Tabs } from "@/components/Tabs/Tabs";
import { useItineraries, useMyReviews } from "@/lib/api/itineraries";
import type { ItineraryReview, ItinerarySummary } from "@/lib/api/itineraries";
import { formatDate, formatItineraryCode } from "@/lib/format";
import {
  guideOptions,
  isBalanced,
  ITINERARY_STATUS,
  itineraryStatus,
  packageOptions,
  proportionText,
  reviewQueue,
  STATUS_LABEL,
  toEffortCount,
} from "@/lib/itinerary";
import { ItinerariesTable } from "./ItinerariesTable";

type ManagerTab = "review" | "all";

const MANAGER_SUBTITLES: Record<ManagerTab, string> = {
  review: "Itinerarios validados por un guía y pendientes de tu aprobación. Los más antiguos primero.",
  all: "Todos los itinerarios de los paquetes, en cualquier estado.",
};

export function ManagerList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const itineraries = useItineraries();
  const tab: ManagerTab = searchParams.get("tab") === "all" ? "all" : "review";

  const queue = itineraries.data ? reviewQueue(itineraries.data) : [];

  const header = (
    <>
      <PageHeader title={tab === "all" ? "Itinerarios" : "Por revisar"} subtitle={MANAGER_SUBTITLES[tab]} />
      <Tabs
        label="Vista"
        items={[
          { key: "review", label: "Por revisar", count: itineraries.data ? queue.length : undefined },
          { key: "all", label: "Todos", count: itineraries.data?.length },
        ]}
        value={tab}
        onChange={key => setSearchParams(key === "review" ? {} : { tab: key }, { replace: true })}
      />
    </>
  );

  if (itineraries.isPending) {
    return (
      <>
        {header}
        <LoadingPanel />
      </>
    );
  }

  if (itineraries.isError) {
    return (
      <>
        {header}
        <LoadError title="No se pudieron cargar los itinerarios" error={itineraries.error} onRetry={() => itineraries.refetch()} />
      </>
    );
  }

  if (tab === "all") {
    return (
      <>
        {header}
        <ItinerariesTable items={itineraries.data} title="Todos los itinerarios" allPackagesLabel="Todos" />
      </>
    );
  }

  return (
    <>
      {header}
      <ReviewQueue queue={queue} />
      <ReviewedTable />
    </>
  );
}

const BALANCE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "ok", label: "Cumple todos" },
  { value: "bad", label: "Incumple alguno" },
];

function ReviewQueue({ queue }: { queue: ItinerarySummary[] }) {
  const navigate = useNavigate();
  const [packageId, setPackageId] = useState("");
  const [guideId, setGuideId] = useState("");
  const [balance, setBalance] = useState("");

  const visible = queue.filter(
    item =>
      (!packageId || String(item.package_id) === packageId) &&
      (!guideId || String(item.guide_id) === guideId) &&
      (!balance || isBalanced(item) === (balance === "ok")),
  );

  function resetFilters() {
    setPackageId("");
    setGuideId("");
    setBalance("");
  }

  return (
    <>
      <FilterBar summary={`${visible.length} pendientes`} onReset={resetFilters}>
        <Field
          id="queue-package"
          label="Paquete"
          options={packageOptions(queue, "Todos")}
          value={packageId}
          onChange={event => setPackageId(event.target.value)}
        />
        <Field
          id="queue-guide"
          label="Creador"
          options={guideOptions(queue)}
          value={guideId}
          onChange={event => setGuideId(event.target.value)}
        />
        <Field
          id="queue-balance"
          label="Equilibrio"
          options={BALANCE_OPTIONS}
          value={balance}
          onChange={event => setBalance(event.target.value)}
        />
      </FilterBar>

      {queue.length === 0 && (
        <Panel>
          <EmptyState icon="check-circle" title="No tienes itinerarios por revisar">
            Cuando un guía valide un itinerario de tus paquetes aparecerá aquí.
          </EmptyState>
        </Panel>
      )}

      {queue.length > 0 && visible.length === 0 && (
        <Panel>
          <EmptyState
            title="Ningún itinerario coincide con los filtros"
            action={
              <Button size="sm" onClick={resetFilters}>
                Quitar filtros
              </Button>
            }
          />
        </Panel>
      )}

      {visible.length > 0 && (
        <div className="itineraries__queue">
          {visible.map(item => (
            <ItineraryCard
              key={item.id}
              itinerary={{
                id: formatItineraryCode(item.id),
                package: item.package_name,
                status: itineraryStatus(item),
                creator: item.guide_name,
                date: formatDate(item.submitted_date ?? item.creation_date),
                days: item.days,
                activities: item.activity_count,
                effort: toEffortCount(item.effort),
                params: proportionText(item.proportion_types),
              }}
              actions={
                <div className="itineraries__card-actions">
                  <span className={isBalanced(item) ? "itineraries__balance" : "itineraries__balance itineraries__balance--bad"}>
                    Cumple {item.criteria_met} de {item.criteria_total} criterios
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    aria-label={`Revisar ${formatItineraryCode(item.id)}`}
                    onClick={() => navigate(`/itineraries/${item.id}`)}
                  >
                    Revisar
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

const REVIEWED_DAYS = 30;

type ReviewRow = ItineraryReview & { key: string };

const REVIEWED_COLUMNS: Column<ReviewRow>[] = [
  {
    key: "itinerary_id",
    label: "Itinerario",
    render: row => <span className="itineraries__code">{formatItineraryCode(row.itinerary_id)}</span>,
    exportValue: row => formatItineraryCode(row.itinerary_id),
  },
  { key: "package_name", label: "Paquete" },
  { key: "guide_name", label: "Creador" },
  {
    key: "review_date",
    label: "Revisado",
    render: row => <span className="itineraries__mono">{formatDate(row.review_date)}</span>,
    exportValue: row => formatDate(row.review_date),
  },
  {
    key: "result",
    label: "Resultado",
    render: row => <StatusPill status={ITINERARY_STATUS[row.result]} />,
    exportValue: row => STATUS_LABEL[row.result],
  },
  {
    key: "observations",
    label: "Observaciones",
    sortable: false,
    render: row => <span className="itineraries__muted">{row.observations || "—"}</span>,
    exportValue: row => row.observations ?? "",
  },
];

function ReviewedTable() {
  const navigate = useNavigate();
  const reviews = useMyReviews(REVIEWED_DAYS);

  if (reviews.isPending) return <LoadingPanel rows={3} />;
  if (reviews.isError) {
    return <LoadError title="No se pudieron cargar tus revisiones" error={reviews.error} onRetry={() => reviews.refetch()} />;
  }

  const rows = reviews.data.map(review => ({ ...review, key: `${review.itinerary_id}-${review.review_date}` }));

  return (
    <DataTable
      title="Revisados por ti"
      subtitle={`Últimos ${REVIEWED_DAYS} días`}
      columns={REVIEWED_COLUMNS}
      rows={rows}
      rowKey="key"
      defaultSort={{ key: "review_date", dir: "desc" }}
      onRowClick={row => navigate(`/itineraries/${row.itinerary_id}`)}
      exportable
      emptyText={`No has revisado itinerarios en los últimos ${REVIEWED_DAYS} días.`}
    />
  );
}

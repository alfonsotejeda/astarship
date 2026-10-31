import { useNavigate } from "react-router";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { useMyReviews } from "@/lib/api/itineraries";
import type { ItineraryReview } from "@/lib/api/itineraries";
import { formatDate, formatItineraryCode } from "@/lib/format";
import { ITINERARY_STATUS } from "@/lib/itinerary";
import { STATUS_LABEL } from "../lib/filters";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";

const DAYS = 30;

type ReviewRow = ItineraryReview & { key: string };

const COLUMNS: Column<ReviewRow>[] = [
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

export function ReviewedTable() {
  const navigate = useNavigate();
  const reviews = useMyReviews(DAYS);

  if (reviews.isPending) return <LoadingPanel rows={3} />;
  if (reviews.isError) {
    return <LoadError title="No se pudieron cargar tus revisiones" error={reviews.error} onRetry={() => reviews.refetch()} />;
  }

  const rows = reviews.data.map(review => ({ ...review, key: `${review.itinerary_id}-${review.review_date}` }));

  return (
    <DataTable
      title="Revisados por ti"
      subtitle={`Últimos ${DAYS} días`}
      columns={COLUMNS}
      rows={rows}
      rowKey="key"
      defaultSort={{ key: "review_date", dir: "desc" }}
      onRowClick={row => navigate(`/itinerarios/${row.itinerary_id}`)}
      exportable
      emptyText={`No has revisado itinerarios en los últimos ${DAYS} días.`}
    />
  );
}

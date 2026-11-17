import { useState } from "react";
import { Alert } from "@/components/Alert/Alert";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Tabs } from "@/components/Tabs/Tabs";
import { useAssignItinerary } from "@/lib/api/assignments";
import { useRejectBooking } from "@/lib/api/bookings";
import type { Booking, usePendingBookings } from "@/lib/api/bookings";
import { useItineraries } from "@/lib/api/itineraries";
import type { ItinerarySummary } from "@/lib/api/itineraries";
import { formatDate, formatItineraryCode } from "@/lib/format";
import { itineraryLabel } from "./shared";

type Row = Booking & { key: string };

function bookingsText(count: number) {
  return count === 1 ? "1 pendiente" : `${count} pendientes`;
}

const COLUMNS: Column<Row>[] = [
  {
    key: "tourist_name",
    label: "Turista",
    render: row => <span className="assignments__strong">{row.tourist_name}</span>,
  },
  { key: "package_name", label: "Paquete" },
  {
    key: "booking_date",
    label: "Pedido",
    render: row => <span className="assignments__mono">{formatDate(row.booking_date)}</span>,
    exportValue: row => formatDate(row.booking_date),
  },
  {
    key: "requested_start_date",
    label: "Quiere empezar",
    render: row =>
      row.requested_start_date ? (
        <span className="assignments__mono">{formatDate(row.requested_start_date)}</span>
      ) : (
        <span className="assignments__muted">—</span>
      ),
    exportValue: row => (row.requested_start_date ? formatDate(row.requested_start_date) : ""),
  },
  {
    key: "preferred_itinerary_id",
    label: "Prefiere",
    render: row =>
      row.preferred_itinerary_id !== null ? (
        <span className="assignments__mono">{formatItineraryCode(row.preferred_itinerary_id)}</span>
      ) : (
        <span className="assignments__muted">—</span>
      ),
    exportValue: row => (row.preferred_itinerary_id !== null ? formatItineraryCode(row.preferred_itinerary_id) : ""),
  },
  {
    key: "origin",
    label: "Origen",
    render: row =>
      row.requested_start_date !== null ? <Badge tone="category">Catálogo</Badge> : <Badge>Inscrito por ti</Badge>,
    sortValue: row => (row.requested_start_date !== null ? 0 : 1),
    exportValue: row => (row.requested_start_date !== null ? "Catálogo" : "Inscrito por el administrador"),
  },
];

export function PendingTab({ bookings }: { bookings: ReturnType<typeof usePendingBookings> }) {
  const itineraries = useItineraries();

  if (bookings.isPending || itineraries.isPending) return <LoadingPanel rows={6} />;

  const failed = [bookings, itineraries].find(query => query.isError);
  if (failed || !bookings.data || !itineraries.data) {
    return (
      <LoadError
        title="No se pudieron cargar las reservas pendientes"
        error={failed?.error ?? null}
        onRetry={() => [bookings, itineraries].forEach(query => query.refetch())}
      />
    );
  }

  return <PendingContent bookings={bookings.data} itineraries={itineraries.data} />;
}

function PendingContent({ bookings, itineraries }: { bookings: Booking[]; itineraries: ItinerarySummary[] }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [packageId, setPackageId] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const rows: Row[] = bookings.map(booking => ({ ...booking, key: `${booking.package_id}-${booking.tourist_id}` }));
  const shown = rows.filter(row => !packageId || String(row.package_id) === packageId);
  const selected = rows.find(row => row.key === selectedKey);
  const packages = [...new Map(rows.map(row => [row.package_id, row.package_name])).entries()];

  if (rows.length === 0) {
    return (
      <>
        {done && (
          <Alert tone="ok" title="Hecho" onDismiss={() => setDone(null)}>
            {done}
          </Alert>
        )}
        <Panel>
          <EmptyState icon="check-circle" title="No hay paquetes pendientes de asignar">
            Cuando un turista pida un paquete desde el catálogo aparecerá aquí.
          </EmptyState>
        </Panel>
      </>
    );
  }

  return (
    <>
      {done && (
        <Alert tone="ok" title="Hecho" onDismiss={() => setDone(null)}>
          {done}
        </Alert>
      )}

      <div className="assignments__columns">
        <div className="assignments__main">
          <FilterBar summary={bookingsText(shown.length)} onReset={() => setPackageId("")}>
            <Field
              id="pending-package"
              label="Paquete"
              options={[
                { value: "", label: "Todos" },
                ...packages.map(([id, name]) => ({ value: String(id), label: name })),
              ]}
              value={packageId}
              onChange={event => setPackageId(event.target.value)}
            />
          </FilterBar>

          <DataTable
            title="Pendientes de asignación"
            subtitle="Los más antiguos primero. Pulsa uno para asignarle un itinerario o rechazarlo."
            columns={COLUMNS}
            rows={shown}
            rowKey="key"
            defaultSort={{ key: "booking_date", dir: "asc" }}
            onRowClick={row => setSelectedKey(row.key)}
            selectedKey={selectedKey ?? undefined}
            exportable
            emptyText="No hay pendientes de este paquete."
          />
        </div>

        {selected && (
          <div className="assignments__side">
            <ResolvePanel
              key={selected.key}
              booking={selected}
              itineraries={itineraries}
              onDone={message => {
                setSelectedKey(null);
                setDone(message);
              }}
              onClose={() => setSelectedKey(null)}
            />
          </div>
        )}
      </div>
    </>
  );
}

type ResolvePanelProps = {
  booking: Booking;
  itineraries: ItinerarySummary[];
  onDone: (message: string) => void;
  onClose: () => void;
};

function ResolvePanel({ booking, itineraries, onDone, onClose }: ResolvePanelProps) {
  const assign = useAssignItinerary();
  const reject = useRejectBooking();
  const approved = itineraries.filter(item => item.package_id === booking.package_id && item.status === "approved");
  const preferred = approved.find(item => item.id === booking.preferred_itinerary_id);
  const [mode, setMode] = useState("assign");
  // The tourist's preference and date come first; the admin can change both
  const [itineraryId, setItineraryId] = useState(String(preferred?.id ?? approved[0]?.id ?? ""));
  const [startDate, setStartDate] = useState(booking.requested_start_date ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();

  const busy = assign.isPending || reject.isPending;
  const failure = assign.error ?? reject.error;

  function submit() {
    if (mode === "reject") {
      if (!reason.trim()) {
        setError("Escribe el motivo: el turista lo verá.");
        return;
      }
      reject.mutate(
        { packageId: booking.package_id, touristId: booking.tourist_id, reason: reason.trim() },
        { onSuccess: () => onDone(`Rechazaste «${booking.package_name}» de ${booking.tourist_name}.`) },
      );
      return;
    }

    if (!itineraryId || !startDate) {
      setError(!itineraryId ? "El paquete no tiene itinerarios aprobados." : "Elige la fecha de inicio.");
      return;
    }
    assign.mutate(
      { itineraryId: Number(itineraryId), user_ids: [booking.tourist_id], start_date: startDate },
      {
        onSuccess: () =>
          onDone(
            `${formatItineraryCode(Number(itineraryId))} asignado a ${booking.tourist_name}, desde el ${formatDate(startDate)}.`,
          ),
      },
    );
  }

  return (
    <Panel
      title={booking.tourist_name}
      subtitle={booking.package_name}
      actions={<Button variant="ghost" size="sm" icon="x" aria-label="Cerrar" onClick={onClose} />}
      footer={
        <div className="assignments__footer">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant={mode === "reject" ? "danger" : "primary"} disabled={busy} onClick={submit}>
            {mode === "reject" ? "Rechazar" : "Asignar itinerario"}
          </Button>
        </div>
      }
    >
      <Tabs
        variant="segmented"
        label="Qué hacer"
        items={[
          { key: "assign", label: "Asignar" },
          { key: "reject", label: "Rechazar" },
        ]}
        value={mode}
        onChange={key => {
          setMode(key);
          setError(undefined);
        }}
      />

      {failure && (
        <Alert tone="bad" title="No se pudo guardar">
          {failure.message}
        </Alert>
      )}

      {mode === "assign" ? (
        <>
          <Field
            id="pending-itinerary"
            label="Itinerario"
            options={
              approved.length > 0
                ? approved.map(item => ({
                    value: String(item.id),
                    label: item.id === preferred?.id ? `${itineraryLabel(item)} · preferido` : itineraryLabel(item),
                  }))
                : [{ value: "", label: "Sin itinerarios aprobados" }]
            }
            value={itineraryId}
            disabled={approved.length === 0}
            hint={booking.preferred_itinerary_id !== null ? "El turista marcó uno como preferido." : undefined}
            onChange={event => setItineraryId(event.target.value)}
          />
          <Field
            id="pending-date"
            label="Fecha de inicio"
            type="date"
            required
            value={startDate}
            error={error}
            hint={
              booking.requested_start_date
                ? `Propuesta por el turista: ${formatDate(booking.requested_start_date)}.`
                : "Lo inscribiste tú: no propuso fecha."
            }
            onChange={event => {
              setStartDate(event.target.value);
              setError(undefined);
            }}
          />
          <p className="assignments__muted">Lo verá en Mis itinerarios. Un turista no puede tener dos itinerarios del mismo paquete.</p>
        </>
      ) : (
        <Field
          id="pending-reason"
          label="Motivo"
          multiline
          required
          placeholder="No hay plazas en esas fechas…"
          value={reason}
          error={error}
          hint="El turista lo verá y podrá volver a pedirlo."
          onChange={event => {
            setReason(event.target.value);
            setError(undefined);
          }}
        />
      )}
    </Panel>
  );
}

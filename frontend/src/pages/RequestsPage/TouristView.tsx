import { useEffect, useState } from "react";
import { useCurrentUser } from "@/app/providers/auth/AuthContext";
import { Alert } from "@/components/Alert/Alert";
import { Button } from "@/components/Button/Button";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { ChipSelect } from "@/components/ChipSelect/ChipSelect";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { RequestCard } from "@/components/RequestCard/RequestCard";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { useCreateModificationRequest, useModificationRequests, useSupportGuides } from "@/lib/api/requests";
import { useMyAssignment, useMyAssignments } from "@/lib/api/trips";
import type { Assignment } from "@/lib/api/trips";
import { formatItineraryCode, formatShortDate } from "@/lib/format";
import { markSeen, resolvedRequestKeys } from "@/lib/seen";
import { toCard } from "./shared";

const TOURIST_HEADER = (
  <PageHeader
    title="Pedir modificación"
    subtitle="Cuéntanos qué necesitas cambiar. Tu guía la atenderá y verás aquí el resultado."
  />
);

// Only a trip in progress or yet to start can still change; the one in progress comes first
function changeableTrips(assignments: Assignment[]) {
  return assignments
    .filter(item => item.status !== "finished")
    .sort((a, b) => (a.status === b.status ? a.start_date.localeCompare(b.start_date) : a.status === "in_progress" ? -1 : 1));
}

export function TouristView() {
  const assignments = useMyAssignments();

  let form;
  if (assignments.isPending) {
    form = <LoadingPanel rows={5} />;
  } else if (assignments.isError) {
    form = (
      <LoadError title="No se pudieron cargar tus itinerarios" error={assignments.error} onRetry={() => assignments.refetch()} />
    );
  } else {
    const trips = changeableTrips(assignments.data);
    form =
      trips.length === 0 ? (
        <Panel title="Nueva solicitud">
          <EmptyState icon="route" title="No tienes viajes en curso ni próximos">
            Solo puedes pedir cambios en un itinerario que aún no ha terminado.
          </EmptyState>
        </Panel>
      ) : (
        <RequestForm trips={trips} />
      );
  }

  return (
    <>
      {TOURIST_HEADER}

      <div className="requests__columns">
        <div className="requests__main">{form}</div>
        <div className="requests__side">
          <MyRequests />
        </div>
      </div>
    </>
  );
}

function tripLabel(trip: Assignment) {
  const when = trip.status === "in_progress" ? "en curso" : formatShortDate(trip.start_date);
  return `${formatItineraryCode(trip.itinerary_id)} · ${trip.package_name} · ${when}`;
}

function RequestForm({ trips }: { trips: Assignment[] }) {
  const create = useCreateModificationRequest();
  const [itineraryId, setItineraryId] = useState(trips[0].itinerary_id);
  const [activityIds, setActivityIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [support, setSupport] = useState(false);
  const [guideId, setGuideId] = useState("");
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState<string | null>(null);

  const trip = trips.find(item => item.itinerary_id === itineraryId) ?? trips[0];
  const detail = useMyAssignment(trip.itinerary_id);
  const guides = useSupportGuides(trip.itinerary_id);

  const supportGuides = guides.data ?? [];
  const shownGuide = guideId || String(supportGuides[0]?.id ?? "");
  const stops = (detail.data?.trip_days ?? []).flatMap(day => day.stops);
  const activities = stops
    .filter((stop, index) => stops.findIndex(item => item.activity_id === stop.activity_id) === index)
    .map(stop => ({ value: String(stop.activity_id), label: stop.activity_name }));

  function changeTrip(value: string) {
    setItineraryId(Number(value));
    setActivityIds([]);
    setGuideId("");
  }

  function send() {
    if (!description.trim()) {
      setError("Cuéntanos qué necesitas cambiar.");
      return;
    }

    const supportGuide = support ? supportGuides.find(item => String(item.id) === shownGuide) : undefined;
    create.mutate(
      {
        itinerary_id: trip.itinerary_id,
        activity_ids: activityIds.map(Number),
        description: description.trim(),
        support_guide_id: supportGuide?.id ?? null,
      },
      {
        onSuccess: () => {
          setSent(`${trip.guide_name} la recibirá ahora${supportGuide ? ` y ${supportGuide.name} como apoyo` : ""}.`);
          setActivityIds([]);
          setDescription("");
          setSupport(false);
        },
      },
    );
  }

  return (
    <Panel title="Nueva solicitud">
      {sent && (
        <Alert tone="ok" title="Solicitud enviada" onDismiss={() => setSent(null)}>
          {sent} Te avisaremos cuando haya un resultado.
        </Alert>
      )}

      {create.isError && (
        <Alert tone="bad" title="No se pudo enviar la solicitud">
          {create.error.message}
        </Alert>
      )}

      <Field
        id="requests-itinerary"
        label="Itinerario"
        options={trips.map(item => ({ value: String(item.itinerary_id), label: tripLabel(item) }))}
        value={String(trip.itinerary_id)}
        onChange={event => changeTrip(event.target.value)}
      />

      <div className="requests__group">
        <span className="requests__group-label">Actividades que quieres cambiar</span>
        {detail.isPending ? (
          <Skeleton height={36} />
        ) : detail.isError ? (
          <span className="requests__muted">No se pudieron cargar las actividades de este itinerario.</span>
        ) : (
          <ChipSelect label="Actividades" options={activities} value={activityIds} onChange={setActivityIds} />
        )}
      </div>

      <Field
        id="requests-description"
        label="Qué necesitas"
        multiline
        required
        value={description}
        error={error}
        hint="Cuanto más concreta, más rápido se resuelve."
        onChange={event => {
          setDescription(event.target.value);
          setError(undefined);
        }}
      />

      <Checkbox
        id="requests-support"
        label="Pedir apoyo de otro guía"
        description={
          guides.isSuccess && supportGuides.length === 0
            ? "No hay otros guías en este paquete."
            : `Además de ${trip.guide_name}, otro guía del paquete podrá atenderla.`
        }
        checked={support}
        disabled={!guides.isSuccess || supportGuides.length === 0}
        onChange={event => setSupport(event.target.checked)}
      />

      {support && (
        <Field
          id="requests-guide"
          label="Guía de apoyo"
          options={supportGuides.map(item => ({
            value: String(item.id),
            label: item.specialty ? `${item.name} · ${item.specialty.toLowerCase()}` : item.name,
          }))}
          value={shownGuide}
          onChange={event => setGuideId(event.target.value)}
        />
      )}

      <div className="requests__send">
        <Button variant="primary" icon="message" disabled={create.isPending} onClick={send}>
          {create.isPending ? "Enviando…" : "Enviar solicitud"}
        </Button>
      </div>
    </Panel>
  );
}

function MyRequests() {
  const user = useCurrentUser();
  const requests = useModificationRequests();

  // Seeing the results here clears the menu count
  useEffect(() => {
    if (requests.data) markSeen(user.id, "requests", resolvedRequestKeys(requests.data));
  }, [requests.data, user.id]);

  let content;
  if (requests.isPending) {
    content = (
      <div className="requests__mine" aria-busy="true">
        <Skeleton height={120} />
        <Skeleton height={120} />
      </div>
    );
  } else if (requests.isError) {
    content = (
      <LoadError title="No se pudieron cargar tus solicitudes" error={requests.error} onRetry={() => requests.refetch()} />
    );
  } else if (requests.data.length === 0) {
    content = (
      <Panel>
        <EmptyState icon="message" title="Todavía no has pedido ninguna modificación">
          Las que envíes aparecerán aquí con su estado y, al cerrarse, su resultado.
        </EmptyState>
      </Panel>
    );
  } else {
    content = requests.data.map(request => <RequestCard key={request.id} request={toCard(request, true)} />);
  }

  return (
    <section className="requests__mine" aria-labelledby="requests-mine-title">
      <h2 id="requests-mine-title" className="requests__title">
        Tus solicitudes
      </h2>
      {content}
    </section>
  );
}

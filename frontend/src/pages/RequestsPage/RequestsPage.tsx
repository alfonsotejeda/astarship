import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE } from "@/app/providers/auth/roles";
import { Alert } from "@/components/Alert/Alert";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { ChipSelect } from "@/components/ChipSelect/ChipSelect";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { RequestCard } from "@/components/RequestCard/RequestCard";
import type { ModificationRequest as CardRequest } from "@/components/RequestCard/RequestCard";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import type { RequestStatus } from "@/components/StatusPill/StatusPill";
import { Tabs } from "@/components/Tabs/Tabs";
import { Toast } from "@/components/Toast/Toast";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useItineraries } from "@/lib/api/itineraries";
import {
  useCreateModificationRequest,
  useModificationRequests,
  useSupportGuides,
  useUpdateModificationRequest,
} from "@/lib/api/requests";
import type { ModificationRequest, ModificationRequestStatus } from "@/lib/api/requests";
import { useMyAssignment, useMyAssignments } from "@/lib/api/trips";
import type { Assignment } from "@/lib/api/trips";
import { formatDate, formatItineraryCode, formatShortDate, isToday } from "@/lib/format";
import "./RequestsPage.css";

export function RequestsPage() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "guide") return <GuideView />;
  if (user.role === "tourist") return <TouristView />;
  return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
}

const REQUEST_STATUS: Record<ModificationRequestStatus, RequestStatus> = {
  requested: "solicitada",
  in_progress: "atendiendo",
  resolved: "resuelta",
  denied: "denegada",
};

function isOpen(request: ModificationRequest) {
  return request.status === "requested" || request.status === "in_progress";
}

function toCard(request: ModificationRequest, mine = false): CardRequest {
  return {
    tourist: mine ? "Tú" : request.tourist_name,
    group: mine ? undefined : (request.group_name ?? undefined),
    itinerary: formatItineraryCode(request.itinerary_id),
    date: isToday(request.request_date) ? "hoy" : formatDate(request.request_date),
    description: request.description,
    supportGuide: request.support_guide_name ?? undefined,
    status: REQUEST_STATUS[request.status],
    result: request.result ?? undefined,
  };
}

type GuideTab = "open" | "closed";

const GUIDE_HEADER = (
  <PageHeader
    title="Solicitudes de modificación"
    subtitle="De los turistas que tienes asignados y de los que te piden apoyo aunque tengan otro guía."
  />
);

function GuideView() {
  const requests = useModificationRequests();

  if (requests.isPending) {
    return (
      <>
        {GUIDE_HEADER}
        <LoadingPanel rows={4} />
      </>
    );
  }

  if (requests.isError) {
    return (
      <>
        {GUIDE_HEADER}
        <LoadError title="No se pudieron cargar las solicitudes" error={requests.error} onRetry={() => requests.refetch()} />
      </>
    );
  }

  return <GuideContent requests={requests.data} />;
}

function GuideContent({ requests }: { requests: ModificationRequest[] }) {
  const navigate = useNavigate();
  const isPhone = useMediaQuery("(max-width: 480px)");
  const update = useUpdateModificationRequest();
  const [tab, setTab] = useState<GuideTab>("open");
  // Opens on the request being handled, as in the artboard
  const [selectedId, setSelectedId] = useState(() => requests.find(item => item.status === "in_progress")?.id ?? null);
  const [toast, setToast] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const open = requests.filter(isOpen);
  const closed = requests.filter(item => !isOpen(item));
  const shown = tab === "open" ? open : closed;
  const selected = shown.find(item => item.id === selectedId);

  // On phones the panel goes below the cards, so bring it into view
  useEffect(() => {
    if (isPhone && selectedId !== null) panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isPhone, selectedId]);

  function attend(request: ModificationRequest) {
    setSelectedId(request.id);
    if (request.status === "requested") update.mutate({ id: request.id, status: "in_progress" });
  }

  return (
    <>
      {GUIDE_HEADER}

      {update.isError && (
        <Alert tone="bad" title="No se pudo guardar" onDismiss={() => update.reset()}>
          {update.error.message}
        </Alert>
      )}

      <Tabs
        label="Estado"
        items={[
          { key: "open", label: "Abiertas", count: open.length },
          { key: "closed", label: "Cerradas", count: closed.length },
        ]}
        value={tab}
        onChange={key => setTab(key as GuideTab)}
      />

      <div className="requests__columns">
        <div className="requests__cards">
          {shown.map(request => (
            <div key={request.id} className="requests__item">
              {/* RN-08: the guide may be asked to help with another guide's tourist */}
              {request.is_support && <Badge tone="neutral">Te piden apoyo · su guía es {request.guide_name}</Badge>}
              <RequestCard request={toCard(request)} />
              <div className="requests__actions">
                {request.status === "requested" && (
                  <Button size="sm" variant="primary" onClick={() => attend(request)}>
                    Atender
                  </Button>
                )}
                {request.status === "in_progress" && (
                  <Button size="sm" variant="primary" onClick={() => setSelectedId(request.id)}>
                    Registrar resultado
                  </Button>
                )}
                {!isOpen(request) && (
                  <Button size="sm" onClick={() => setSelectedId(request.id)}>
                    Ver detalle
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => navigate(`/itinerarios/${request.itinerary_id}`)}>
                  Ver itinerario
                </Button>
              </div>
            </div>
          ))}

          {shown.length === 0 && (
            <Panel className="requests__empty">
              <EmptyState icon="message" title="No hay solicitudes aquí">
                {tab === "open"
                  ? "Cuando un turista pida un cambio en su itinerario aparecerá en Abiertas."
                  : "Las solicitudes que resuelvas o deniegues aparecerán aquí con su resultado."}
              </EmptyState>
            </Panel>
          )}
        </div>

        {selected && (
          <div ref={panelRef} className="requests__side">
            {isOpen(selected) ? (
              <ResultForm
                key={selected.id}
                request={selected}
                onClose={() => setSelectedId(null)}
                onSaved={message => {
                  setSelectedId(null);
                  setToast(message);
                }}
              />
            ) : (
              <RequestDetail request={selected} onClose={() => setSelectedId(null)} />
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className="requests__toast">
          <Toast key={toast} tone="ok" onClose={() => setToast(null)}>
            {toast}
          </Toast>
        </div>
      )}
    </>
  );
}

function RequestQuote({ request }: { request: ModificationRequest }) {
  return (
    <div className="requests__quote">
      {request.description}
      {request.activity_names.length > 0 && (
        <span className="requests__muted">Actividades: {request.activity_names.join(", ")}</span>
      )}
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return <Button variant="ghost" size="sm" icon="x" aria-label="Cerrar" onClick={onClose} />;
}

type Outcome = "changed" | "unchanged" | "denied";

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: "changed", label: "Itinerario modificado" },
  { value: "unchanged", label: "Sin cambios: se resolvió de otra forma" },
  { value: "denied", label: "Denegada" },
];

const RESULT_LABEL: Record<Outcome, string> = {
  changed: "Qué cambiaste",
  unchanged: "Cómo se resolvió",
  denied: "Por qué se deniega",
};

const NEW_ITINERARY = "new";

type ResultFormProps = {
  request: ModificationRequest;
  onClose: () => void;
  onSaved: (message: string) => void;
};

function ResultForm({ request, onClose, onSaved }: ResultFormProps) {
  const navigate = useNavigate();
  const itineraries = useItineraries();
  const update = useUpdateModificationRequest();
  const [outcome, setOutcome] = useState<Outcome>("changed");
  const [replacement, setReplacement] = useState("");
  const [result, setResult] = useState("");
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string>();

  // RF-31: the new itinerary is an approved one of the same package
  const replacements = (itineraries.data ?? []).filter(
    item => item.package_id === request.package_id && item.status === "approved" && item.id !== request.itinerary_id,
  );
  const shownReplacement = replacement || (replacements[0] ? String(replacements[0].id) : NEW_ITINERARY);
  const generate = outcome === "changed" && shownReplacement === NEW_ITINERARY;

  function save() {
    if (generate) {
      navigate("/itinerarios/nuevo");
      return;
    }
    if (!result.trim()) {
      setError("Cuéntale al turista el resultado.");
      return;
    }

    update.mutate(
      {
        id: request.id,
        status: outcome === "denied" ? "denied" : "resolved",
        result: result.trim(),
        new_itinerary_id: outcome === "changed" ? Number(shownReplacement) : null,
        notify_tourist: notify,
      },
      {
        onSuccess: () =>
          onSaved(
            notify
              ? `Resultado guardado. ${request.tourist_name} lo verá en Solicitudes.`
              : "Resultado guardado.",
          ),
      },
    );
  }

  return (
    <Panel
      className="requests__panel"
      title="Registrar resultado"
      subtitle={`${request.tourist_name} · ${formatItineraryCode(request.itinerary_id)}`}
      actions={<CloseButton onClose={onClose} />}
      footer={
        <div className="requests__footer">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={update.isPending} onClick={save}>
            {generate ? "Generar itinerario" : update.isPending ? "Guardando…" : "Guardar resultado"}
          </Button>
        </div>
      }
    >
      <RequestQuote request={request} />

      {update.isError && (
        <Alert tone="bad" title="No se pudo guardar el resultado">
          {update.error.message}
        </Alert>
      )}

      <Field
        id="requests-outcome"
        label="Resultado"
        options={OUTCOMES}
        value={outcome}
        onChange={event => setOutcome(event.target.value as Outcome)}
      />

      {outcome === "changed" && (
        <Field
          id="requests-replacement"
          label="Itinerario que lo sustituye"
          options={[
            { value: NEW_ITINERARY, label: "Generar uno nuevo" },
            ...replacements.map(item => ({
              value: String(item.id),
              label: `${formatItineraryCode(item.id)} · aprobado · ${item.days === 1 ? "1 día" : `${item.days} días`}`,
            })),
          ]}
          value={shownReplacement}
          disabled={itineraries.isPending}
          hint={
            generate
              ? "Al generarlo vuelve aquí para registrar el resultado."
              : "Genera uno nuevo o elige uno aprobado del mismo paquete."
          }
          onChange={event => setReplacement(event.target.value)}
        />
      )}

      {!generate && (
        <>
          <Field
            id="requests-result"
            label={RESULT_LABEL[outcome]}
            multiline
            required
            value={result}
            error={error}
            onChange={event => {
              setResult(event.target.value);
              setError(undefined);
            }}
          />
          <Checkbox
            id="requests-notify"
            label="Avisar al turista"
            description="Verá el resultado en Solicitudes."
            checked={notify}
            onChange={event => setNotify(event.target.checked)}
          />
        </>
      )}
    </Panel>
  );
}

function RequestDetail({ request, onClose }: { request: ModificationRequest; onClose: () => void }) {
  return (
    <Panel
      className="requests__panel"
      title="Detalle de la solicitud"
      subtitle={`${request.tourist_name} · ${formatItineraryCode(request.itinerary_id)}`}
      actions={<CloseButton onClose={onClose} />}
    >
      <RequestQuote request={request} />
      <div className="requests__detail">
        <span className="requests__label">Estado</span>
        <StatusPill status={REQUEST_STATUS[request.status]} />
      </div>
      {request.result && (
        <div className="requests__detail">
          <span className="requests__label">Resultado</span>
          {request.result}
        </div>
      )}
      {request.new_itinerary_id !== null && (
        <div className="requests__detail">
          <span className="requests__label">Itinerario que lo sustituye</span>
          <span className="requests__mono">{formatItineraryCode(request.new_itinerary_id)}</span>
        </div>
      )}
    </Panel>
  );
}

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

function TouristView() {
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
  const requests = useModificationRequests();

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

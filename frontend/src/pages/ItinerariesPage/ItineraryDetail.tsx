import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Alert } from "@/components/Alert/Alert";
import type { Tone } from "@/components/Alert/tones";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { CriteriaCheck } from "@/components/CriteriaCheck/CriteriaCheck";
import { EffortChart } from "@/components/EffortChart/EffortChart";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { ReviewPanel } from "@/components/ReviewPanel/ReviewPanel";
import type { ReviewDecision as PanelDecision, ReviewResult } from "@/components/ReviewPanel/ReviewPanel";
import { RouteMapPanel } from "@/components/RouteMapPanel/RouteMapPanel";
import { RoutePanel } from "@/components/RoutePanel/RoutePanel";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { Toast } from "@/components/Toast/Toast";
import { useAttractions } from "@/lib/api/attractions";
import { useActivityTypes } from "@/lib/api/catalogs";
import { ApiError } from "@/lib/api/client";
import { useItineraries, useItinerary, useReviewItinerary } from "@/lib/api/itineraries";
import type { ItineraryDetail as Detail, PackageHistoryItem, ReviewDecision } from "@/lib/api/itineraries";
import { formatDate, formatItineraryCode } from "@/lib/format";
import { dayLabel, exportItinerary, itineraryStatus, proportionText, reviewQueue, toCriteria } from "@/lib/itinerary";

type ToastMessage = { tone: Tone; text: string };

const DECISION: Record<PanelDecision, ReviewDecision> = { aprobar: "approve", rechazar: "reject", rehacer: "redo" };

function reviewMessage(itinerary: Detail, decision: ReviewDecision) {
  const code = formatItineraryCode(itinerary.id);
  if (decision === "reject") return `Rechazaste ${code}.`;
  if (decision === "redo") return `Pediste otro itinerario en lugar de ${code}.`;
  return itinerary.review === "validate" ? `Validaste ${code}. Pasa al jefe de operaciones.` : `Aprobaste ${code}.`;
}

export function ItineraryDetail({ id }: { id: number }) {
  const navigate = useNavigate();
  const itinerary = useItinerary(id);
  const itineraries = useItineraries();
  const activityTypes = useActivityTypes();
  const attractions = useAttractions();
  const review = useReviewItinerary(id);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const code = formatItineraryCode(id);
  const breadcrumbs = [{ label: "Itinerarios", to: "/itineraries" }, { label: code }];

  const toastElement = toast && (
    <div className="itineraries__toast">
      <Toast tone={toast.tone} onClose={() => setToast(null)}>
        {toast.text}
      </Toast>
    </div>
  );

  if (itinerary.isPending) {
    return (
      <>
        <PageHeader title={code} breadcrumbs={breadcrumbs} />
        <LoadingPanel rows={8} />
      </>
    );
  }

  if (itinerary.isError) {
    const notFound = itinerary.error instanceof ApiError && itinerary.error.status === 404;
    return (
      <>
        <PageHeader title={code} breadcrumbs={breadcrumbs} />
        {notFound ? (
          <Panel>
            <EmptyState
              icon="route"
              title="Este itinerario no existe o no puedes verlo"
              action={<Button onClick={() => navigate("/itineraries")}>Volver a itinerarios</Button>}
            />
          </Panel>
        ) : (
          <LoadError title="No se pudo cargar el itinerario" error={itinerary.error} onRetry={() => itinerary.refetch()} />
        )}
        {toastElement}
      </>
    );
  }

  const data = itinerary.data;
  const types = activityTypes.data?.map(type => ({ code: type.code, label: type.name })) ?? [];

  // Previous and next within the current user's review queue
  const queue = reviewQueue(itineraries.data ?? []);
  const index = queue.findIndex(item => item.id === id);
  const previous = index > 0 ? queue[index - 1] : undefined;
  const next = index >= 0 ? queue[index + 1] : undefined;

  function handleReview(result: ReviewResult) {
    if (review.isPending) return;
    const decision = DECISION[result.decision];
    // Read before submitting: once reviewed, this itinerary leaves the queue
    const upcoming = next;

    review.mutate(
      { result: decision, observations: result.observations },
      {
        onSuccess: () => {
          setToast({ tone: "ok", text: reviewMessage(data, decision) });
          if (upcoming) navigate(`/itineraries/${upcoming.id}`);
        },
        onError: error => setToast({ tone: "bad", text: `No se pudo registrar la revisión: ${error.message}` }),
      },
    );
  }

  return (
    <>
      <PageHeader
        title={`${code} · ${data.package_name}`}
        subtitle={`Generado por ${data.guide_name} · ${formatDate(data.generated_at)} · ${data.days.length} días · ${data.activity_count} actividades`}
        breadcrumbs={breadcrumbs}
        status={
          <>
            <StatusPill status={itineraryStatus(data)} />
            {data.replaces_id !== null && <Badge>Sustituye a {formatItineraryCode(data.replaces_id)}</Badge>}
          </>
        }
        actions={
          <>
            {index >= 0 && (
              <>
                <Button variant="ghost" disabled={!previous} onClick={() => previous && navigate(`/itineraries/${previous.id}`)}>
                  Anterior
                </Button>
                <Button variant="ghost" disabled={!next} onClick={() => next && navigate(`/itineraries/${next.id}`)}>
                  Siguiente ({queue.length - index - 1})
                </Button>
              </>
            )}
            <Button icon="download" onClick={() => exportItinerary(data, types)}>
              Exportar PDF
            </Button>
          </>
        }
      />

      <div className="itineraries__columns">
        <div className="itineraries__main">
          <ParamsPanel itinerary={data} />
          <RoutePanel key={data.id} days={data.days} />
          {attractions.data && (
            <RouteMapPanel key={`map-${data.id}`} days={data.days} attractions={attractions.data} dayLabel={dayLabel} />
          )}
          <EffortChart days={data.days} />
        </div>

        <div className="itineraries__side">
          <Panel>
            <CriteriaCheck items={toCriteria(data.criteria)} />
          </Panel>

          {data.review && (
            <ReviewPanel key={data.id} id={`review-${data.id}`} onSubmit={handleReview}>
              {data.review === "validate" && (
                <Alert tone="info">Validas como guía: si lo apruebas, pasa al jefe de operaciones.</Alert>
              )}
            </ReviewPanel>
          )}

          <HistoryPanel history={data.history} />
        </div>
      </div>

      {toastElement}
    </>
  );
}

function ParamsPanel({ itinerary }: { itinerary: Detail }) {
  const params = [
    { key: "Proporción", value: proportionText(itinerary.proportion_types) },
    { key: "Total", value: `${itinerary.activity_count} actividades` },
    { key: "Días", value: String(itinerary.days.length) },
    { key: "Esfuerzo alto", value: itinerary.avoid_late_high_effort ? "Evitar tras 17:00" : "Sin límite" },
  ];

  return (
    <Panel title="Parámetros usados" subtitle={`Los fijó ${itinerary.guide_name} al generar.`}>
      <dl className="itineraries__params">
        {params.map(param => (
          <div key={param.key} className="itineraries__param">
            <dt className="itineraries__eyebrow">{param.key}</dt>
            <dd className="itineraries__param-value">{param.value}</dd>
          </div>
        ))}
      </dl>

      <div className="itineraries__categories">
        <span className="itineraries__muted">Categorías del paquete:</span>
        {itinerary.package_categories.map(category => (
          <Badge key={category} tone="category">
            {category}
          </Badge>
        ))}
      </div>
    </Panel>
  );
}

function HistoryPanel({ history }: { history: PackageHistoryItem[] }) {
  return (
    <Panel title="Historial del paquete">
      {history.length === 0 && <p className="itineraries__muted">Es el primer itinerario de este paquete.</p>}

      {history.length > 0 && (
        <ul className="itineraries__history">
          {history.map(item => (
            <li key={item.itinerary_id} className="itineraries__history-item">
              <div className="itineraries__history-head">
                <Link to={`/itineraries/${item.itinerary_id}`} className="itineraries__history-link">
                  {formatItineraryCode(item.itinerary_id)} · {formatDate(item.date)}
                </Link>
                <StatusPill status={itineraryStatus(item)} />
              </div>
              <span className="itineraries__muted">
                {item.observations ? `«${item.observations}»` : "Sin observaciones."}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert } from "@/components/Alert/Alert";
import type { Tone } from "@/components/Alert/tones";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { CriteriaCheck } from "@/components/CriteriaCheck/CriteriaCheck";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { ReviewPanel } from "@/components/ReviewPanel/ReviewPanel";
import type { ReviewDecision as PanelDecision, ReviewResult } from "@/components/ReviewPanel/ReviewPanel";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { Toast } from "@/components/Toast/Toast";
import { useActivityTypes } from "@/lib/api/catalogs";
import { ApiError } from "@/lib/api/client";
import { useItineraries, useItinerary, useReviewItinerary } from "@/lib/api/itineraries";
import type { ItineraryDetail, ReviewDecision } from "@/lib/api/itineraries";
import { formatDate, formatItineraryCode } from "@/lib/format";
import { exportItinerary, itineraryStatus, toCriteria } from "@/lib/itinerary";
import { reviewQueue } from "../lib/queue";
import { EffortChart } from "./EffortChart";
import { HistoryPanel } from "./HistoryPanel";
import { ParamsPanel } from "./ParamsPanel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { RoutePanel } from "./RoutePanel";

type ToastMessage = { tone: Tone; text: string };

const DECISION: Record<PanelDecision, ReviewDecision> = { aprobar: "approve", rechazar: "reject", rehacer: "redo" };

function reviewMessage(itinerary: ItineraryDetail, decision: ReviewDecision) {
  const code = formatItineraryCode(itinerary.id);
  if (decision === "reject") return `Rechazaste ${code}.`;
  if (decision === "redo") return `Pediste otro itinerario en lugar de ${code}.`;
  return itinerary.review === "validate" ? `Validaste ${code}. Pasa al jefe de operaciones.` : `Aprobaste ${code}.`;
}

export function DetailView({ id }: { id: number }) {
  const navigate = useNavigate();
  const itinerary = useItinerary(id);
  const itineraries = useItineraries();
  const activityTypes = useActivityTypes();
  const review = useReviewItinerary(id);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const code = formatItineraryCode(id);
  const breadcrumbs = [{ label: "Itinerarios", to: "/itinerarios" }, { label: code }];

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
              action={<Button onClick={() => navigate("/itinerarios")}>Volver a itinerarios</Button>}
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
          if (upcoming) navigate(`/itinerarios/${upcoming.id}`);
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
                <Button variant="ghost" disabled={!previous} onClick={() => previous && navigate(`/itinerarios/${previous.id}`)}>
                  Anterior
                </Button>
                <Button variant="ghost" disabled={!next} onClick={() => next && navigate(`/itinerarios/${next.id}`)}>
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

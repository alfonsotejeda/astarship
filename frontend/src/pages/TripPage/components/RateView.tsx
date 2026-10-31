import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert } from "@/components/Alert/Alert";
import { Button } from "@/components/Button/Button";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Rating } from "@/components/Rating/Rating";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { toEffortLevel } from "@/lib/api/activities";
import { ApiError } from "@/lib/api/client";
import { useMyAssignment, useRateTrip, useRecordVisit } from "@/lib/api/trips";
import type { AssignmentDetail } from "@/lib/api/trips";
import { formatDate, formatDateRange, formatItineraryCode, formatTime } from "@/lib/format";
import { RATING_WORDS } from "../lib/trip";

const BREADCRUMBS = [{ label: "Mis itinerarios", to: "/viaje/itinerarios" }, { label: "Valorar" }];

export function RateView({ itineraryId, userId }: { itineraryId: number; userId: number }) {
  const navigate = useNavigate();
  const assignment = useMyAssignment(itineraryId);

  if (assignment.isPending) {
    return (
      <>
        <PageHeader title="Valora tu viaje" breadcrumbs={BREADCRUMBS} />
        <LoadingPanel rows={6} />
      </>
    );
  }

  if (assignment.isError) {
    const notFound = assignment.error instanceof ApiError && assignment.error.status === 404;
    return (
      <>
        <PageHeader title="Valora tu viaje" breadcrumbs={BREADCRUMBS} />
        {notFound ? (
          <Panel>
            <EmptyState
              icon="route"
              title="No tienes asignado este itinerario"
              action={<Button onClick={() => navigate("/viaje/itinerarios")}>Ver mis itinerarios</Button>}
            />
          </Panel>
        ) : (
          <LoadError title="No se pudo cargar tu viaje" error={assignment.error} onRetry={() => assignment.refetch()} />
        )}
      </>
    );
  }

  return <RateForm key={assignment.data.itinerary_id} assignment={assignment.data} userId={userId} />;
}

function RateForm({ assignment, userId }: { assignment: AssignmentDetail; userId: number }) {
  const rateTrip = useRateTrip(assignment.itinerary_id, userId);
  const visit = useRecordVisit(assignment.itinerary_id, userId);
  const [rating, setRating] = useState(assignment.rating ?? 0);
  const [comment, setComment] = useState(assignment.comment ?? "");

  const finished = assignment.status === "finished";
  const stops = assignment.trip_days.flatMap(day => day.stops.map(stop => ({ day: day.day, stop })));

  return (
    <>
      <PageHeader
        title="Valora tu viaje"
        subtitle={`${assignment.package_name} · ${formatItineraryCode(assignment.itinerary_id)} · ${formatDateRange(assignment.start_date, assignment.end_date)} · guía ${assignment.guide_name}`}
        breadcrumbs={BREADCRUMBS}
      />

      {!finished && (
        <Alert tone="info" title="Tu viaje todavía no ha terminado">
          Podrás valorarlo a partir del {formatDate(assignment.end_date)}.
        </Alert>
      )}

      {rateTrip.isSuccess && (
        <Alert tone="ok" title="Gracias por tu valoración">
          La verán tu guía y el jefe de operaciones. Puedes cambiarla desde Mis valoraciones.
        </Alert>
      )}

      {(rateTrip.isError || visit.isError) && (
        <Alert tone="bad" title="No se pudo guardar">
          {(rateTrip.error ?? visit.error)?.message}
        </Alert>
      )}

      <div className="trip__columns">
        <div className="trip__rate-overall">
          <Panel title="El viaje en general">
            <div className="trip__overall">
              <Rating
                value={rating}
                onChange={finished ? setRating : undefined}
                size="lg"
                label="Valoración general del viaje"
              />
              <span className="trip__muted">{RATING_WORDS[rating]}</span>
            </div>
            <Field
              id="trip-comment"
              label="Comentario"
              multiline
              placeholder="Qué te gustó y qué cambiarías"
              value={comment}
              disabled={!finished}
              onChange={event => setComment(event.target.value)}
            />
            <Button
              variant="primary"
              block
              disabled={!finished || rating === 0 || rateTrip.isPending}
              onClick={() => rateTrip.mutate({ rating, comment: comment.trim() })}
            >
              {rateTrip.isPending ? "Enviando…" : assignment.rating !== null ? "Actualizar valoración" : "Enviar valoración"}
            </Button>
          </Panel>
        </div>

        <div className="trip__rate-activities">
          <Panel title="Cada actividad" subtitle="Solo puedes valorar las que hiciste." flush>
            <ul className="trip__activities">
              {stops.map(({ day, stop }) => (
                <li key={stop.activity_id} className="trip__activity">
                  <div className="trip__activity-main">
                    <span className="trip__strong">{stop.activity_name}</span>
                    <span className="trip__muted">
                      Día {day} · {formatTime(stop.start_time)}
                    </span>
                  </div>
                  <EffortMeter level={toEffortLevel(stop.effort_level)} />
                  {stop.visit_status === "done" && (
                    <Rating
                      value={stop.rating ?? 0}
                      onChange={value => visit.mutate({ activityId: stop.activity_id, status: "done", rating: value })}
                      label={`Valora ${stop.activity_name}`}
                    />
                  )}
                  {stop.visit_status === "skipped" && <StatusPill status="abandonada" />}
                  {stop.visit_status === null && <StatusPill status="pendiente">Sin marcar</StatusPill>}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

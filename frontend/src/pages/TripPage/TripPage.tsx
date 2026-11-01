import { useState } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE } from "@/app/providers/auth/roles";
import { Alert } from "@/components/Alert/Alert";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { Icon } from "@/components/Icon/Icon";
import { EffortSplit } from "@/components/ItineraryCard/EffortSplit";
import { ItineraryCard } from "@/components/ItineraryCard/ItineraryCard";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Rating } from "@/components/Rating/Rating";
import { RouteTimeline } from "@/components/RouteTimeline/RouteTimeline";
import type { RouteStop } from "@/components/RouteTimeline/RouteTimeline";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import type { VisitStatus as PillVisit } from "@/components/StatusPill/StatusPill";
import { Tabs } from "@/components/Tabs/Tabs";
import { Toast } from "@/components/Toast/Toast";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { toActivityType, toEffortLevel } from "@/lib/api/activities";
import { ApiError } from "@/lib/api/client";
import { useMyAssignment, useMyAssignments, useRateTrip, useRecordVisit, useToday } from "@/lib/api/trips";
import type {
  Assignment,
  AssignmentDetail,
  AssignmentStatus,
  Today,
  TripDay,
  TripGuide,
  TripStop,
  VisitRequest,
} from "@/lib/api/trips";
import { formatDate, formatDateRange, formatDuration, formatItineraryCode, formatTime, formatWeekday } from "@/lib/format";
import { toEffortCount } from "@/lib/itinerary";
import {
  ASSIGNMENT_STATUS,
  currentIndex,
  dayEffort,
  dayTabLabel,
  doneCount,
  exportTrip,
  PILL_TO_VISIT,
  RATING_WORDS,
  toTripStops,
  travelText,
} from "@/lib/trip";
import "./TripPage.css";

export function TripPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const { pathname } = useLocation();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "tourist") return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  if (id !== undefined) {
    const itineraryId = Number(id);
    if (!Number.isInteger(itineraryId)) return <Navigate to="/viaje/itinerarios" replace />;
    if (pathname.endsWith("/valorar")) return <RateView itineraryId={itineraryId} userId={user.id} />;
    return <DetailView itineraryId={itineraryId} />;
  }

  if (pathname.startsWith("/viaje/itinerarios")) return <TripsView />;
  return <TodayView userId={user.id} />;
}

type UndoableToast = { tone: "ok" | "bad"; text: string; undo?: () => void };

function TodayView({ userId }: { userId: number }) {
  const navigate = useNavigate();
  const today = useToday();

  if (today.isPending) {
    return (
      <>
        <PageHeader title="Hoy" subtitle="Cargando tu itinerario…" />
        <Panel title="Tu recorrido">
          <Skeleton variant="stops" label="Cargando tu itinerario de hoy" />
        </Panel>
      </>
    );
  }

  if (today.isError) {
    return (
      <>
        <PageHeader title="Hoy" />
        <LoadError title="No se pudo cargar tu itinerario de hoy" error={today.error} onRetry={() => today.refetch()} />
      </>
    );
  }

  if (!today.data) {
    return (
      <>
        <PageHeader title="Hoy" />
        <Panel>
          <EmptyState
            icon="calendar"
            title="Hoy no tienes actividades"
            action={<Button onClick={() => navigate("/viaje/itinerarios")}>Ver mis itinerarios</Button>}
          >
            Cuando empiece tu próximo viaje verás aquí el recorrido del día.
          </EmptyState>
        </Panel>
      </>
    );
  }

  return <TodayContent key={today.data.itinerary_id} today={today.data} userId={userId} />;
}

function TodayContent({ today, userId }: { today: Today; userId: number }) {
  const navigate = useNavigate();
  const isPhone = useMediaQuery("(max-width: 480px)");
  const visit = useRecordVisit(today.itinerary_id, userId);
  const [day, setDay] = useState(String(today.day));
  const [toast, setToast] = useState<UndoableToast | null>(null);

  const todayDay = today.days.find(item => item.day === today.day) ?? today.days[0];
  const shownDay = today.days.find(item => String(item.day) === day) ?? todayDay;
  const current = currentIndex(todayDay);
  const nowStop = current !== undefined ? todayDay.stops[current] : undefined;

  function findStop(stop: RouteStop) {
    return todayDay.stops.find(item => item.activity_id === stop.id);
  }

  function save(stop: TripStop, change: VisitRequest, text: string) {
    const previous = { status: stop.visit_status, rating: stop.rating };
    visit.mutate(
      { activityId: stop.activity_id, ...change },
      {
        onSuccess: () =>
          setToast({
            tone: "ok",
            text,
            undo: () => visit.mutate({ activityId: stop.activity_id, ...previous }),
          }),
        onError: error => setToast({ tone: "bad", text: `No se pudo guardar: ${error.message}` }),
      },
    );
  }

  function handleVisit(routeStop: RouteStop, status: Exclude<PillVisit, "pendiente">) {
    const stop = findStop(routeStop);
    if (!stop) return;
    const text =
      status === "realizada" ? `¡Visita registrada! ${stop.activity_name}.` : `Anotado: no hiciste ${stop.activity_name}.`;
    save(stop, { status: PILL_TO_VISIT[status], rating: null }, text);
  }

  function handleRate(routeStop: RouteStop, rating: number) {
    const stop = findStop(routeStop);
    if (stop) save(stop, { status: "done", rating }, `Valoración guardada: ${rating} de 5.`);
  }

  const alternative = today.alternative && (
    <Alert tone="warn" title="Cambio de horario">
      {today.alternative.reason}. Te proponemos {today.alternative.activity_name} a las{" "}
      {formatTime(today.alternative.start_time)} en su lugar.
    </Alert>
  );

  const todayTimeline = (
    <RouteTimeline
      stops={toTripStops(todayDay)}
      showCumulative={false}
      currentIndex={current}
      onVisit={handleVisit}
      onRate={handleRate}
      label="Hoy"
    />
  );

  const toastElement = toast && (
    <div className="trip__toast">
      {/* A new message restarts the countdown */}
      <Toast
        key={toast.text}
        tone={toast.tone}
        action={toast.undo ? "Deshacer" : undefined}
        onAction={toast.undo}
        onClose={() => setToast(null)}
      >
        {toast.text}
      </Toast>
    </div>
  );

  // Phones get the artboard's single column: today only, without the side panels
  if (isPhone) {
    return (
      <>
        <header className="trip__mobile-head">
          <span className="trip__eyebrow trip__eyebrow--route">
            Día {today.day} de {today.days.length} · {formatWeekday(todayDay.date)}
          </span>
          <h1 className="trip__mobile-title">Tu itinerario de hoy</h1>
          <span className="trip__muted">
            {today.package_name} · guía {today.guide.name}
          </span>
        </header>

        <div className="trip__card">
          <DaySummary day={todayDay} />
        </div>

        {alternative}
        {todayTimeline}

        <div className="trip__request">
          <Button variant="secondary" icon="message" block onClick={() => navigate("/solicitudes")}>
            Pedir modificación
          </Button>
          <span className="trip__muted">Puedes pedir apoyo de otro guía además de {today.guide.name}.</span>
        </div>

        {toastElement}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Hoy · ${formatWeekday(todayDay.date)}`}
        subtitle={`${today.package_name} · día ${today.day} de ${today.days.length} · guía ${today.guide.name}`}
        actions={
          <>
            <Button icon="download" onClick={() => exportTrip(`Mi viaje · ${today.package_name}`, today.days)}>
              Exportar PDF
            </Button>
            <Button icon="message" onClick={() => navigate("/solicitudes")}>
              Pedir modificación
            </Button>
          </>
        }
      />

      <div className="trip__columns">
        <div className="trip__main">
          <Panel title="Tu recorrido" subtitle="Marca cada actividad al terminarla y valórala.">
            <Tabs
              label="Días"
              items={today.days.map(item => ({ key: String(item.day), label: dayTabLabel(item, today.day) }))}
              value={String(shownDay.day)}
              onChange={setDay}
            />
            {shownDay.day === today.day ? (
              todayTimeline
            ) : (
              <RouteTimeline stops={toTripStops(shownDay)} showCumulative={false} label={`Día ${shownDay.day}`} />
            )}
          </Panel>
        </div>

        <div className="trip__side">
          {nowStop && <NowCard stop={nowStop} previous={current ? todayDay.stops[current - 1] : undefined} />}
          {alternative}
          <Panel title="Tu día">
            <DaySummary day={todayDay} />
          </Panel>
          <GuidePanel guide={today.guide} />
        </div>
      </div>

      {toastElement}
    </>
  );
}

function NowCard({ stop, previous }: { stop: TripStop; previous?: TripStop }) {
  const type = toActivityType(stop.activity_type_code);
  const travel = travelText(stop, previous);

  return (
    <section className="trip__now" aria-labelledby="trip-now-title">
      <span className="trip__eyebrow trip__eyebrow--route">Ahora · {formatTime(stop.start_time)}</span>
      <h2 id="trip-now-title" className="trip__now-title">
        {stop.activity_name}
      </h2>
      {stop.attraction_name && (
        <span className="trip__line trip__muted">
          <Icon name="pin" size={14} />
          {stop.attraction_name}
        </span>
      )}
      <div className="trip__meta">
        {type && <Badge tone={type} />}
        <EffortMeter level={toEffortLevel(stop.effort_level)} />
        <span className="trip__mono trip__muted">{formatDuration(stop.duration_minutes)}</span>
      </div>
      {travel && (
        <span className="trip__line">
          <Icon name="route" size={14} />
          {travel}
        </span>
      )}
    </section>
  );
}

function DaySummary({ day }: { day: TripDay }) {
  return (
    <div className="trip__summary">
      <div className="trip__summary-item">
        <span className="trip__eyebrow">Hechas</span>
        <span className="trip__figure">
          {doneCount(day)} de {day.stops.length}
        </span>
      </div>
      <div className="trip__summary-item trip__summary-item--end">
        <span className="trip__eyebrow">Esfuerzo B · M · A</span>
        <EffortSplit effort={dayEffort(day)} />
      </div>
    </div>
  );
}

function GuidePanel({ guide }: { guide: TripGuide }) {
  return (
    <Panel title="Tu guía">
      <div className="trip__guide">
        <span className="trip__strong">{guide.name}</span>
        {guide.specialty && <span className="trip__muted">Especialidad: {guide.specialty.toLowerCase()}</span>}
        {guide.phone && (
          <a className="trip__mono trip__phone" href={`tel:${guide.phone.replace(/\s/g, "")}`}>
            {guide.phone}
          </a>
        )}
      </div>
    </Panel>
  );
}

const TRIP_GROUPS: { status: AssignmentStatus; title: string }[] = [
  { status: "in_progress", title: "En curso" },
  { status: "assigned", title: "Próximos" },
  { status: "finished", title: "Anteriores" },
];

function TripsView() {
  const navigate = useNavigate();
  const assignments = useMyAssignments();
  const header = (
    <PageHeader
      title="Mis itinerarios"
      subtitle="Los itinerarios que te asignaron en cada paquete en el que estás inscrito."
    />
  );

  if (assignments.isPending) {
    return (
      <>
        {header}
        <LoadingPanel rows={4} />
      </>
    );
  }

  if (assignments.isError) {
    return (
      <>
        {header}
        <LoadError title="No se pudieron cargar tus itinerarios" error={assignments.error} onRetry={() => assignments.refetch()} />
      </>
    );
  }

  if (assignments.data.length === 0) {
    return (
      <>
        {header}
        <Panel>
          <EmptyState icon="route" title="Todavía no tienes itinerarios asignados">
            Cuando tu agencia te asigne uno en un paquete en el que estés inscrito aparecerá aquí.
          </EmptyState>
        </Panel>
      </>
    );
  }

  return (
    <>
      {header}

      {TRIP_GROUPS.map(group => {
        const items = assignments.data
          .filter(item => item.status === group.status)
          .sort((a, b) =>
            group.status === "finished" ? b.start_date.localeCompare(a.start_date) : a.start_date.localeCompare(b.start_date),
          );
        if (items.length === 0) return null;

        return (
          <section key={group.status} className="trip__group" aria-labelledby={`trip-group-${group.status}`}>
            <h2 id={`trip-group-${group.status}`} className="trip__eyebrow">
              {group.title}
            </h2>
            <div className="trip__cards">
              {items.map(item => (
                <ItineraryCard
                  key={item.itinerary_id}
                  itinerary={{
                    id: formatItineraryCode(item.itinerary_id),
                    package: item.package_name,
                    status: ASSIGNMENT_STATUS[item.status],
                    creator: `Guía ${item.guide_name}`,
                    days: item.days,
                    activities: item.activity_count,
                    effort: toEffortCount(item.effort),
                  }}
                  onClick={() => navigate(`/viaje/itinerarios/${item.itinerary_id}`)}
                  actions={
                    <div className="trip__card-actions">
                      <span className="trip__mono trip__muted">{formatDateRange(item.start_date, item.end_date)}</span>
                      <TripActions assignment={item} />
                    </div>
                  }
                />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

function TripActions({ assignment }: { assignment: Assignment }) {
  const navigate = useNavigate();

  if (assignment.status === "in_progress") {
    return (
      <Button variant="primary" size="sm" onClick={() => navigate("/viaje/hoy")}>
        Ver hoy
      </Button>
    );
  }
  if (assignment.status === "assigned") {
    return (
      <Button size="sm" onClick={() => navigate("/solicitudes")}>
        Pedir modificación
      </Button>
    );
  }
  if (assignment.rating !== null) {
    return <Rating value={assignment.rating} showValue label="Tu valoración del viaje" />;
  }
  return (
    <Button variant="primary" size="sm" onClick={() => navigate(`/viaje/itinerarios/${assignment.itinerary_id}/valorar`)}>
      Valorar el viaje
    </Button>
  );
}

function DetailView({ itineraryId }: { itineraryId: number }) {
  const navigate = useNavigate();
  const assignment = useMyAssignment(itineraryId);

  const code = formatItineraryCode(itineraryId);
  const breadcrumbs = [{ label: "Mis itinerarios", to: "/viaje/itinerarios" }, { label: code }];

  if (assignment.isPending) {
    return (
      <>
        <PageHeader title={code} breadcrumbs={breadcrumbs} />
        <Panel title="Recorrido">
          <Skeleton variant="stops" label="Cargando tu itinerario" />
        </Panel>
      </>
    );
  }

  if (assignment.isError) {
    const notFound = assignment.error instanceof ApiError && assignment.error.status === 404;
    return (
      <>
        <PageHeader title={code} breadcrumbs={breadcrumbs} />
        {notFound ? (
          <Panel>
            <EmptyState
              icon="route"
              title="No tienes asignado este itinerario"
              action={<Button onClick={() => navigate("/viaje/itinerarios")}>Ver mis itinerarios</Button>}
            />
          </Panel>
        ) : (
          <LoadError title="No se pudo cargar tu itinerario" error={assignment.error} onRetry={() => assignment.refetch()} />
        )}
      </>
    );
  }

  return <DetailContent key={assignment.data.itinerary_id} assignment={assignment.data} breadcrumbs={breadcrumbs} />;
}

type DetailContentProps = {
  assignment: AssignmentDetail;
  breadcrumbs: { label: string; to?: string }[];
};

function DetailContent({ assignment, breadcrumbs }: DetailContentProps) {
  const days = assignment.trip_days;
  const [day, setDay] = useState(String(days[0]?.day ?? ""));
  const shownDay = days.find(item => String(item.day) === day) ?? days[0];

  return (
    <>
      <PageHeader
        title={assignment.package_name}
        status={<StatusPill status={ASSIGNMENT_STATUS[assignment.status]} />}
        subtitle={`${formatItineraryCode(assignment.itinerary_id)} · ${formatDateRange(assignment.start_date, assignment.end_date)} · guía ${assignment.guide_name}`}
        breadcrumbs={breadcrumbs}
        actions={
          <>
            <Button icon="download" onClick={() => exportTrip(`Mi viaje · ${assignment.package_name}`, days)}>
              Exportar PDF
            </Button>
            <TripActions assignment={assignment} />
          </>
        }
      />

      <Panel
        title="Recorrido"
        subtitle={`${assignment.days === 1 ? "1 día" : `${assignment.days} días`} · ${assignment.activity_count} actividades`}
      >
        {shownDay ? (
          <>
            <Tabs
              label="Días"
              items={days.map(item => ({ key: String(item.day), label: dayTabLabel(item) }))}
              value={String(shownDay.day)}
              onChange={setDay}
            />
            {/* Before the trip nothing is marked yet, so the summary would only show zeros */}
            {assignment.status !== "assigned" && <DaySummary day={shownDay} />}
            <RouteTimeline stops={toTripStops(shownDay)} showCumulative={false} label={`Día ${shownDay.day}`} />
          </>
        ) : (
          <EmptyState icon="route" title="Este itinerario todavía no tiene actividades" />
        )}
      </Panel>
    </>
  );
}

const RATE_BREADCRUMBS = [{ label: "Mis itinerarios", to: "/viaje/itinerarios" }, { label: "Valorar" }];

function RateView({ itineraryId, userId }: { itineraryId: number; userId: number }) {
  const navigate = useNavigate();
  const assignment = useMyAssignment(itineraryId);

  if (assignment.isPending) {
    return (
      <>
        <PageHeader title="Valora tu viaje" breadcrumbs={RATE_BREADCRUMBS} />
        <LoadingPanel rows={6} />
      </>
    );
  }

  if (assignment.isError) {
    const notFound = assignment.error instanceof ApiError && assignment.error.status === 404;
    return (
      <>
        <PageHeader title="Valora tu viaje" breadcrumbs={RATE_BREADCRUMBS} />
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
        breadcrumbs={RATE_BREADCRUMBS}
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

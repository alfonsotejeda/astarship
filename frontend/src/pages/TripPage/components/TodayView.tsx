import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert } from "@/components/Alert/Alert";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError } from "@/components/QueryStatus/QueryStatus";
import { RouteTimeline } from "@/components/RouteTimeline/RouteTimeline";
import type { RouteStop } from "@/components/RouteTimeline/RouteTimeline";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import type { VisitStatus as PillVisit } from "@/components/StatusPill/StatusPill";
import { Tabs } from "@/components/Tabs/Tabs";
import { Toast } from "@/components/Toast/Toast";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useRecordVisit, useToday } from "@/lib/api/trips";
import type { Today, TripStop, VisitRequest } from "@/lib/api/trips";
import { formatTime, formatWeekday } from "@/lib/format";
import { currentIndex, dayTabLabel, exportTrip, PILL_TO_VISIT, toTripStops } from "../lib/trip";
import { DaySummary } from "./DaySummary";
import { GuidePanel } from "./GuidePanel";
import { NowCard } from "./NowCard";

type UndoableToast = { tone: "ok" | "bad"; text: string; undo?: () => void };

export function TodayView({ userId }: { userId: number }) {
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

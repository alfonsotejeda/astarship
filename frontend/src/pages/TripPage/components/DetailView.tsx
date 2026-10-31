import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError } from "@/components/QueryStatus/QueryStatus";
import { RouteTimeline } from "@/components/RouteTimeline/RouteTimeline";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { Tabs } from "@/components/Tabs/Tabs";
import { ApiError } from "@/lib/api/client";
import { useMyAssignment } from "@/lib/api/trips";
import type { AssignmentDetail } from "@/lib/api/trips";
import { formatDateRange, formatItineraryCode } from "@/lib/format";
import { ASSIGNMENT_STATUS, dayTabLabel, exportTrip, toTripStops } from "../lib/trip";
import { DaySummary } from "./DaySummary";
import { TripActions } from "./TripActions";

export function DetailView({ itineraryId }: { itineraryId: number }) {
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

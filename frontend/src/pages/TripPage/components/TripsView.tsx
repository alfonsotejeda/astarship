import { useNavigate } from "react-router";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { ItineraryCard } from "@/components/ItineraryCard/ItineraryCard";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Rating } from "@/components/Rating/Rating";
import { useMyAssignments } from "@/lib/api/trips";
import type { Assignment, AssignmentStatus } from "@/lib/api/trips";
import { formatDateRange, formatItineraryCode } from "@/lib/format";
import { toEffortCount } from "@/lib/itinerary";
import { ASSIGNMENT_STATUS } from "../lib/trip";

const GROUPS: { status: AssignmentStatus; title: string }[] = [
  { status: "in_progress", title: "En curso" },
  { status: "assigned", title: "Próximos" },
  { status: "finished", title: "Anteriores" },
];

const SUBTITLE = "Los itinerarios que te asignaron en cada paquete en el que estás inscrito.";

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

export function TripsView() {
  const assignments = useMyAssignments();
  const header = <PageHeader title="Mis itinerarios" subtitle={SUBTITLE} />;

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

      {GROUPS.map(group => {
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

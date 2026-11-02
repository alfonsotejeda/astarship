import { useNavigate } from "react-router";
import { Button } from "@/components/Button/Button";
import { EffortSplit } from "@/components/ItineraryCard/EffortSplit";
import { Rating } from "@/components/Rating/Rating";
import type { Assignment, TripDay } from "@/lib/api/trips";
import { dayEffort, doneCount } from "@/lib/trip";

export function DaySummary({ day }: { day: TripDay }) {
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

// What the tourist can do with a trip, depending on whether it has started or finished
export function TripActions({ assignment }: { assignment: Assignment }) {
  const navigate = useNavigate();

  if (assignment.status === "in_progress") {
    return (
      <Button variant="primary" size="sm" onClick={() => navigate("/trip/today")}>
        Ver hoy
      </Button>
    );
  }
  if (assignment.status === "assigned") {
    return (
      <Button size="sm" onClick={() => navigate("/requests")}>
        Pedir modificación
      </Button>
    );
  }
  if (assignment.rating !== null) {
    return <Rating value={assignment.rating} showValue label="Tu valoración del viaje" />;
  }
  return (
    <Button variant="primary" size="sm" onClick={() => navigate(`/trip/itineraries/${assignment.itinerary_id}/rate`)}>
      Valorar el viaje
    </Button>
  );
}

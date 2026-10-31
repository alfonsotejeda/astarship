import { useNavigate } from "react-router";
import { Button } from "@/components/Button/Button";
import { Rating } from "@/components/Rating/Rating";
import type { Assignment } from "@/lib/api/trips";

export function TripActions({ assignment }: { assignment: Assignment }) {
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

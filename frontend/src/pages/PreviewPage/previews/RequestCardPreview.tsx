import { useState } from "react";
import { Button } from "@/components/Button/Button";
import { RequestCard } from "@/components/RequestCard/RequestCard";
import type { ModificationRequest } from "@/components/RequestCard/RequestCard";

const KNEE_REQUEST: ModificationRequest = {
  id: "SOL-031",
  tourist: "Ana Gómez",
  group: "Habana Octubre A",
  itinerary: "IT-0142",
  date: "11 oct 2026",
  description: "Tengo una lesión de rodilla: pido cambiar la Subida al Morro por una actividad de esfuerzo bajo.",
  supportGuide: "Ernesto Díaz",
  status: "solicitada",
};

const CLOSED: ModificationRequest[] = [
  {
    id: "SOL-028",
    tourist: "Carlos Ruiz",
    group: "Habana Octubre A",
    itinerary: "IT-0142",
    date: "9 oct 2026",
    description: "Quiero adelantar el taller de cocina al día 1.",
    status: "resuelta",
    result: "Taller movido al día 1 a las 12:30. Itinerario reasignado.",
  },
  {
    id: "SOL-025",
    tourist: "Marta León",
    itinerary: "IT-0139",
    date: "6 oct 2026",
    description: "¿Se puede quitar la excursión del último día?",
    status: "denegada",
    result: "Es la única excursión del paquete; se mantiene.",
  },
];

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "var(--space-4)",
  alignItems: "start",
};

export function RequestCardPreview() {
  const [request, setRequest] = useState(KNEE_REQUEST);

  const actions =
    request.status === "solicitada" ? (
      <>
        <Button size="sm" variant="primary" onClick={() => setRequest({ ...request, status: "atendiendo" })}>
          Atender
        </Button>
        <Button size="sm" variant="ghost">
          Ver itinerario
        </Button>
      </>
    ) : request.status === "atendiendo" ? (
      <Button
        size="sm"
        variant="primary"
        onClick={() =>
          setRequest({ ...request, status: "resuelta", result: "Subida al Morro cambiada por la visita al Museo de la Ciudad." })
        }
      >
        Registrar resultado
      </Button>
    ) : (
      <Button size="sm" variant="ghost" onClick={() => setRequest(KNEE_REQUEST)}>
        Reiniciar
      </Button>
    );

  return (
    <>
      <section className="preview-section">
        <h2>Abierta (pulsa las acciones)</h2>
        <div style={gridStyle}>
          <RequestCard request={request} actions={actions} />
        </div>
      </section>

      <section className="preview-section">
        <h2>Cerradas</h2>
        <div style={gridStyle}>
          {CLOSED.map(item => (
            <RequestCard key={item.id} request={item} />
          ))}
        </div>
      </section>
    </>
  );
}

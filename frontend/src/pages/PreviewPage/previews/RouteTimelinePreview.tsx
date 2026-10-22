import { useState } from "react";
import { Button } from "@/components/Button/Button";
import { RouteTimeline } from "@/components/RouteTimeline/RouteTimeline";
import type { RouteStop } from "@/components/RouteTimeline/RouteTimeline";

const DAY: RouteStop[] = [
  { id: 1, time: "08:30", name: "Castillo de la Real Fuerza", place: "Plaza de Armas", type: "visita", effort: "bajo", duration: "1 h" },
  { id: 2, time: "10:00", name: "Ruta a pie por la Habana Vieja", place: "Calle Obispo → Plaza Vieja", type: "excursion", effort: "medio", duration: "2 h" },
  { id: 3, time: "12:30", name: "Taller de cocina criolla", place: "Paladar El Patio", type: "taller", effort: "bajo", duration: "1 h 30 min" },
  { id: 4, time: "15:00", name: "Subida al Morro", place: "Castillo de los Tres Reyes del Morro", type: "excursion", effort: "alto", duration: "2 h" },
  { id: 5, time: "18:30", name: "Cañonazo de las nueve", place: "Fortaleza de La Cabaña", type: "visita", effort: "medio", duration: "1 h 30 min" },
];

const INITIAL_TOURIST_DAY: RouteStop[] = DAY.map((stop, index) => {
  if (index === 0) return { ...stop, status: "realizada", rating: 5 };
  if (index === 1) return { ...stop, status: "abandonada" };
  return stop;
});

export function RouteTimelinePreview() {
  const [stops, setStops] = useState(INITIAL_TOURIST_DAY);
  const current = stops.findIndex(stop => !stop.status || stop.status === "pendiente");

  function patch(target: RouteStop, changes: Partial<RouteStop>) {
    setStops(previous => previous.map(stop => (stop.id === target.id ? { ...stop, ...changes } : stop)));
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-6)", alignItems: "start" }}>
      <section className="preview-section">
        <h2>Guía: esfuerzo acumulado</h2>
        <RouteTimeline label="Día 2 — La Habana colonial" stops={DAY} maxEffort={12} />
      </section>

      <section className="preview-section">
        <h2>Turista: Hoy</h2>
        <RouteTimeline
          label="Hoy"
          stops={stops}
          showCumulative={false}
          currentIndex={current < 0 ? undefined : current}
          onVisit={(stop, status) => patch(stop, { status })}
          onRate={(stop, rating) => patch(stop, { rating })}
        />
        <div className="preview-row">
          <Button size="sm" variant="ghost" onClick={() => setStops(INITIAL_TOURIST_DAY)}>
            Reiniciar el día
          </Button>
        </div>
      </section>
    </div>
  );
}

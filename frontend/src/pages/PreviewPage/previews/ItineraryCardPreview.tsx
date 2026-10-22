import { useState } from "react";
import { Button } from "@/components/Button/Button";
import { EffortSplit } from "@/components/ItineraryCard/EffortSplit";
import { ItineraryCard } from "@/components/ItineraryCard/ItineraryCard";
import type { ItinerarySummary } from "@/components/ItineraryCard/ItineraryCard";

const ITINERARIES: ItinerarySummary[] = [
  { id: "IT-0151", package: "La Habana colonial", status: "validado", creator: "Laura Pérez", date: "10 oct 2026", days: 5, activities: 14, effort: { bajo: 7, medio: 5, alto: 2 }, params: "40 / 35 / 25 %" },
  { id: "IT-0139", package: "Viñales natural", status: "rechazado", creator: "Ernesto Díaz", date: "5 oct 2026", days: 3, activities: 10, effort: { bajo: 2, medio: 3, alto: 5 }, params: "20 / 60 / 20 %" },
  { id: "IT-0128", package: "Trinidad y Topes", status: "asignado", creator: "Yanet Rodríguez", date: "27 sep 2026", days: 1, activities: 4, effort: { bajo: 3, medio: 1, alto: 0 } },
];

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "var(--space-4)",
};

export function ItineraryCardPreview() {
  const [selected, setSelected] = useState("IT-0151");

  return (
    <>
      <section className="preview-section">
        <h2>Cola de revisión (clicables)</h2>
        <div style={gridStyle}>
          {ITINERARIES.map(itinerary => (
            <ItineraryCard
              key={itinerary.id}
              itinerary={itinerary}
              selected={itinerary.id === selected}
              onClick={() => setSelected(itinerary.id)}
              actions={itinerary.status === "rechazado" ? <Button size="sm">Ver observaciones</Button> : undefined}
            />
          ))}
        </div>
      </section>

      <section className="preview-section">
        <h2>Solo lectura</h2>
        <div style={gridStyle}>
          <ItineraryCard itinerary={ITINERARIES[0]} />
        </div>
      </section>

      <section className="preview-section">
        <h2>EffortSplit</h2>
        <div className="preview-row">
          <EffortSplit effort={{ bajo: 7, medio: 5, alto: 2 }} />
          <EffortSplit effort={{ bajo: 2, medio: 3, alto: 5 }} />
          <EffortSplit effort={{ bajo: 0, medio: 0, alto: 0 }} />
        </div>
      </section>
    </>
  );
}

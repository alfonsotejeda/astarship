import { useState } from "react";
import { Rating } from "@/components/Rating/Rating";

export function RatingPreview() {
  const [activity, setActivity] = useState(0);
  const [trip, setTrip] = useState(4);

  return (
    <>
      <section className="preview-section">
        <h2>Lectura</h2>
        <div className="preview-row">
          <Rating value={4} showValue />
          <Rating value={3.5} showValue />
          <Rating value={2.3} showValue />
          <Rating value={5} />
        </div>
      </section>

      <section className="preview-section">
        <h2>Input</h2>
        <div className="preview-row">
          <Rating value={activity} onChange={setActivity} label="Valora la actividad" />
          <Rating value={trip} onChange={setTrip} size="lg" label="Valora el itinerario" showValue />
        </div>
      </section>
    </>
  );
}

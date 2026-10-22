import { useState } from "react";
import { ReviewPanel } from "@/components/ReviewPanel/ReviewPanel";
import type { ReviewResult } from "@/components/ReviewPanel/ReviewPanel";

const DECISION_LABEL = {
  aprobar: "Aprobado",
  rechazar: "Rechazado",
  rehacer: "Pedido otro",
};

export function ReviewPanelPreview() {
  const [result, setResult] = useState<ReviewResult>();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 400px))", gap: "var(--space-6)", alignItems: "start" }}>
      <section className="preview-section">
        <h2>Pedir otro (con observaciones)</h2>
        <ReviewPanel
          id="preview-review"
          defaultDecision="rehacer"
          defaultObservations="Falta cubrir Música y el día 3 acumula dos actividades de esfuerzo alto."
          onSubmit={setResult}
        />
      </section>

      <section className="preview-section">
        <h2>Desde aprobar</h2>
        <ReviewPanel id="preview-review-empty" onSubmit={setResult} />
        <span>
          {result
            ? `${DECISION_LABEL[result.decision]}${result.observations ? `: «${result.observations}»` : ""}`
            : "Sin enviar"}
        </span>
      </section>
    </div>
  );
}

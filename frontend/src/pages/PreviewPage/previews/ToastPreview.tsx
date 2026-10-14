import { useState } from "react";
import { Button } from "@/components/Button/Button";
import { Toast } from "@/components/Toast/Toast";

export function ToastPreview() {
  const [visitToast, setVisitToast] = useState(false);
  const [reviewToast, setReviewToast] = useState(false);
  const [undone, setUndone] = useState(false);

  function showVisit() {
    setUndone(false);
    setVisitToast(true);
  }

  return (
    <>
      <section className="preview-section">
        <h2>Estático</h2>
        <div style={{ display: "grid", gap: "var(--space-3)", justifyItems: "start" }}>
          <Toast action="Deshacer" duration={Infinity}>
            Visita registrada: Castillo de la Real Fuerza.
          </Toast>
          <Toast tone="info" duration={Infinity}>
            Itinerario enviado a revisión.
          </Toast>
        </div>
      </section>

      <section className="preview-section">
        <h2>Cierre automático</h2>
        <div className="preview-row">
          <Button size="sm" onClick={showVisit}>
            Registrar visita (8 s, con acción)
          </Button>
          <Button size="sm" onClick={() => setReviewToast(true)}>
            Enviar a revisión (5 s)
          </Button>
          {undone && <span>Visita deshecha</span>}
        </div>
        <div style={{ display: "grid", gap: "var(--space-3)", justifyItems: "start" }}>
          {visitToast && (
            <Toast action="Deshacer" onAction={() => setUndone(true)} onClose={() => setVisitToast(false)}>
              Visita registrada: Castillo de la Real Fuerza.
            </Toast>
          )}
          {reviewToast && (
            <Toast tone="info" onClose={() => setReviewToast(false)}>
              Itinerario enviado a revisión.
            </Toast>
          )}
        </div>
      </section>
    </>
  );
}

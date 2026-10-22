import { useState } from "react";
import { Checkbox } from "@/components/Checkbox/Checkbox";

const columnStyle = { display: "grid", gap: "var(--space-3)", justifyItems: "start" };

export function CheckboxPreview() {
  const [notify, setNotify] = useState(true);

  return (
    <>
      <section className="preview-section">
        <h2>Con descripción (libre)</h2>
        <div style={columnStyle}>
          <Checkbox label="Puede generar itinerarios" description="En La Habana colonial" defaultChecked />
          <Checkbox label="Puede validar itinerarios" description="En La Habana colonial" />
        </div>
      </section>

      <section className="preview-section">
        <h2>Controlado</h2>
        <div className="preview-row">
          <Checkbox label="Notificar al guía" checked={notify} onChange={event => setNotify(event.target.checked)} />
          <span>{notify ? "Se notificará" : "No se notificará"}</span>
        </div>
      </section>

      <section className="preview-section">
        <h2>Deshabilitado</h2>
        <div style={columnStyle}>
          <Checkbox label="Opción no disponible" disabled />
          <Checkbox label="Opción fijada" disabled defaultChecked />
        </div>
      </section>

      <section className="preview-section">
        <h2>Sin etiqueta visible</h2>
        <div className="preview-row">
          <Checkbox aria-label="Seleccionar Catedral de La Habana" />
          <span>Catedral de La Habana</span>
        </div>
      </section>
    </>
  );
}

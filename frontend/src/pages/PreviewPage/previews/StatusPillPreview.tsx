import { StatusPill } from "@/components/StatusPill/StatusPill";

export function StatusPillPreview() {
  return (
    <>
      <section className="preview-section">
        <h2>Itinerario</h2>
        <div className="preview-row">
          <StatusPill status="generado" />
          <StatusPill status="revision" />
          <StatusPill status="aprobado" />
          <StatusPill status="rehacer" />
          <StatusPill status="asignado" />
        </div>
      </section>

      <section className="preview-section">
        <h2>Solicitud</h2>
        <div className="preview-row">
          <StatusPill status="solicitada" />
          <StatusPill status="atendiendo" />
          <StatusPill status="resuelta" />
          <StatusPill status="denegada" />
        </div>
      </section>

      <section className="preview-section">
        <h2>Visita</h2>
        <div className="preview-row">
          <StatusPill status="pendiente" />
          <StatusPill status="realizada" />
          <StatusPill status="abandonada" />
        </div>
      </section>

      <section className="preview-section">
        <h2>Etiqueta propia</h2>
        <div className="preview-row">
          <StatusPill status="revision">Revisión 2/3</StatusPill>
          <StatusPill status="aprobado" tabIndex={0}>
            Enfocable
          </StatusPill>
        </div>
      </section>
    </>
  );
}

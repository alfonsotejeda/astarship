import { Button } from "@/components/Button/Button";

export function ButtonPreview() {
  return (
    <>
      <section className="preview-section">
        <h2>Variantes</h2>
        <div className="preview-row">
          <Button variant="primary" icon="sparkles">Generar itinerario</Button>
          <Button icon="download">Exportar PDF</Button>
          <Button variant="ghost">Cancelar</Button>
          <Button variant="danger">Pedir otro itinerario</Button>
        </div>
      </section>

      <section className="preview-section">
        <h2>Tamaño sm</h2>
        <div className="preview-row">
          <Button size="sm" variant="primary">Aprobar</Button>
          <Button size="sm" icon="plus">Añadir actividad</Button>
          <Button size="sm" variant="ghost">Ver detalle</Button>
        </div>
      </section>

      <section className="preview-section">
        <h2>Solo icono</h2>
        <div className="preview-row">
          <Button icon="trash" variant="ghost" aria-label="Eliminar" />
          <Button icon="copy" aria-label="Duplicar" />
          <Button icon="x" size="sm" variant="ghost" aria-label="Cerrar" />
        </div>
      </section>

      <section className="preview-section">
        <h2>Deshabilitado</h2>
        <div className="preview-row">
          <Button variant="primary" disabled>Aprobar</Button>
          <Button disabled>Exportar PDF</Button>
          <Button variant="danger" disabled>Eliminar actividad</Button>
        </div>
      </section>

      <section className="preview-section">
        <h2>Block</h2>
        <div className="preview-narrow">
          <Button variant="primary" block>Generar itinerario</Button>
        </div>
      </section>
    </>
  );
}

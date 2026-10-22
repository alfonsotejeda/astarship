import { Badge } from "@/components/Badge/Badge";

export function BadgePreview() {
  return (
    <>
      <section className="preview-section">
        <h2>Tipos de actividad</h2>
        <div className="preview-row">
          <Badge tone="visita" />
          <Badge tone="excursion" />
          <Badge tone="taller" />
        </div>
      </section>

      <section className="preview-section">
        <h2>Categorías</h2>
        <div className="preview-row">
          <Badge tone="category">Patrimonio</Badge>
          <Badge tone="category">Gastronomía</Badge>
          <Badge>+3</Badge>
        </div>
      </section>

      <section className="preview-section">
        <h2>Neutral</h2>
        <div className="preview-row">
          <Badge>Duplicado posible</Badge>
          <Badge>Inscrito</Badge>
        </div>
      </section>
    </>
  );
}

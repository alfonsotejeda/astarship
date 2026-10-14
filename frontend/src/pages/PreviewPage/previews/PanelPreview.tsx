import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import { Panel } from "@/components/Panel/Panel";

const ROWS = [
  { name: "Catedral de La Habana", type: "visita", effort: "bajo" },
  { name: "Ruta por el Malecón", type: "excursion", effort: "medio" },
  { name: "Taller de tabaco", type: "taller", effort: "bajo" },
] as const;

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
  padding: "var(--space-3) var(--space-4)",
  borderTop: "1px solid var(--line)",
};

export function PanelPreview() {
  return (
    <>
      <section className="preview-section">
        <h2>Completo</h2>
        <div style={{ maxWidth: 520 }}>
          <Panel
            title="Parámetros de generación"
            subtitle="Se guardan junto al itinerario"
            actions={
              <Button variant="ghost" size="sm">
                Restablecer
              </Button>
            }
            footer={<small style={{ color: "var(--ink-muted)" }}>Último cambio hace 2 min</small>}
          >
            <p style={{ margin: 0 }}>Total de actividades: 14 · Duración: 5 días</p>
          </Panel>
        </div>
      </section>

      <section className="preview-section">
        <h2>Flush</h2>
        <div style={{ maxWidth: 520 }}>
          <Panel title="Actividades seleccionadas" subtitle="3 de 14" flush>
            {ROWS.map((row, index) => (
              <div key={row.name} style={{ ...rowStyle, borderTop: index ? rowStyle.borderTop : undefined }}>
                <span style={{ flex: 1 }}>{row.name}</span>
                <Badge tone={row.type} />
                <EffortMeter level={row.effort} />
              </div>
            ))}
          </Panel>
        </div>
      </section>

      <section className="preview-section">
        <h2>Sin cabecera</h2>
        <div style={{ maxWidth: 520 }}>
          <Panel>
            <p style={{ margin: 0 }}>Un panel con solo cuerpo.</p>
          </Panel>
        </div>
      </section>
    </>
  );
}

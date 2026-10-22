import { StatTile } from "@/components/StatTile/StatTile";

const rowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "var(--space-4)",
};

export function StatTilePreview() {
  return (
    <section className="preview-section">
      <h2>Fila de reporte</h2>
      <div style={rowStyle}>
        <StatTile label="Valoración media" value="4,2" unit="/ 5" note="+0,3 frente al grupo" noteTone="ok" />
        <StatTile
          label="Tasa de abandono"
          value="12"
          unit="%"
          note="Actividades de esfuerzo alto: 27 %"
          noteTone="bad"
        />
        <StatTile label="Itinerarios aprobados" value="9" unit="de 14" />
        <StatTile label="Visitas registradas" value="318" note="Últimos 30 días" />
      </div>
    </section>
  );
}

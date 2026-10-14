import { useState } from "react";
import { Tabs } from "@/components/Tabs/Tabs";

const DAYS = [
  { key: "d1", label: "Día 1" },
  { key: "d2", label: "Día 2" },
  { key: "d3", label: "Día 3" },
];

const REQUESTS = [
  { key: "pending", label: "Pendientes", count: 4 },
  { key: "resolved", label: "Resueltas", count: 12 },
  { key: "denied", label: "Denegadas", count: 0 },
];

const VIEWS = [
  { key: "chart", label: "Gráfico" },
  { key: "table", label: "Tabla" },
];

export function TabsPreview() {
  const [view, setView] = useState("chart");

  return (
    <>
      <section className="preview-section">
        <h2>Underline (libre)</h2>
        <Tabs label="Días" items={DAYS} defaultValue="d2" />
      </section>

      <section className="preview-section">
        <h2>Con contador</h2>
        <Tabs label="Solicitudes" items={REQUESTS} />
      </section>

      <section className="preview-section">
        <h2>Segmented (controlado)</h2>
        <div className="preview-row">
          <Tabs variant="segmented" label="Vista" items={VIEWS} value={view} onChange={setView} />
          <span>Vista actual: {view === "chart" ? "Gráfico" : "Tabla"}</span>
        </div>
      </section>
    </>
  );
}

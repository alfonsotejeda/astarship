import { ChartPanel } from "@/components/ChartPanel/ChartPanel";
import type { ChartSeries } from "@/components/ChartPanel/ChartPanel";

const EFFORT_SERIES: ChartSeries[] = [
  { key: "low", label: "Bajo", color: "effort-low" },
  { key: "medium", label: "Medio", color: "effort-medium" },
  { key: "high", label: "Alto", color: "effort-high" },
];

const BY_CATEGORY = [
  { cat: "Patrimonio", low: 14, medium: 9, high: 3 },
  { cat: "Gastronomía", low: 11, medium: 2, high: 0 },
  { cat: "Naturaleza", low: 2, medium: 6, high: 8 },
  { cat: "Música", low: 7, medium: 4, high: 1 },
  { cat: "Arte", low: 9, medium: 3, high: 0 },
];

const SATISFACTION_SERIES: ChartSeries[] = [
  { key: "visita", label: "Visita", color: "destination" },
  { key: "excursion", label: "Excursión", color: "origin" },
  { key: "taller", label: "Taller", color: "workshop" },
];

const SATISFACTION = [
  { effort: "Bajo", visita: 4.5, excursion: 4.2, taller: 4.6 },
  { effort: "Medio", visita: 4.1, excursion: 4.4, taller: 4.3 },
  { effort: "Alto", visita: 3.6, excursion: 3.9, taller: 3.8 },
];

const EFFORT_RATING = [
  { name: "Catedral de La Habana", x: 1, y: 4.6 },
  { name: "Plaza Vieja", x: 1.2, y: 4.4 },
  { name: "Ruta por el Malecón", x: 2, y: 4.1 },
  { name: "Taller de tabaco", x: 1.1, y: 4.7 },
  { name: "Subida al Pan de Guajaibón", x: 3, y: 3.4, highlight: true },
  { name: "Cuevas de Bellamar", x: 2.4, y: 3.9 },
  { name: "Senderismo en Topes", x: 2.8, y: 3.6 },
];

export function ChartPanelPreview() {
  return (
    <>
      <ChartPanel
        title="Actividades más utilizadas"
        subtitle="Itinerarios finales de La Habana colonial (ejemplo)"
        kind="stacked"
        xKey="cat"
        xLabel="Categoría"
        yLabel="Actividades"
        series={EFFORT_SERIES}
        data={BY_CATEGORY}
        exportable
      />

      <ChartPanel
        title="Satisfacción por esfuerzo"
        subtitle="Valoración media por tipo de actividad (ejemplo)"
        kind="grouped"
        xKey="effort"
        xLabel="Esfuerzo"
        yMax={5}
        series={SATISFACTION_SERIES}
        data={SATISFACTION}
        exportable
      />

      <ChartPanel
        title="Esfuerzo y valoración"
        subtitle="Cada punto es una actividad (ejemplo)"
        kind="scatter"
        xLabel="Esfuerzo"
        yLabel="Valoración"
        xDomain={[0.5, 3.5]}
        yDomain={[3, 5]}
        xTicks={[
          { value: 1, label: "Bajo" },
          { value: 2, label: "Medio" },
          { value: 3, label: "Alto" },
        ]}
        trend={[
          { x: 1, y: 4.6 },
          { x: 3, y: 3.5 },
        ]}
        series={[{ key: "activity", label: "Actividad", color: "route" }]}
        data={EFFORT_RATING}
        footnote="El punto destacado es la actividad con más abandonos."
        exportable
      />
    </>
  );
}

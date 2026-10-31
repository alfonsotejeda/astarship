import { ChartPanel } from "@/components/ChartPanel/ChartPanel";
import { toEffortLevel } from "@/lib/api/activities";
import type { ItineraryDay } from "@/lib/api/itineraries";
import { EFFORT_LABEL } from "@/lib/itinerary";

const SERIES = [
  { key: "bajo", label: EFFORT_LABEL.bajo, color: "effort-low" },
  { key: "medio", label: EFFORT_LABEL.medio, color: "effort-medium" },
  { key: "alto", label: EFFORT_LABEL.alto, color: "effort-high" },
];

export function EffortChart({ days }: { days: ItineraryDay[] }) {
  const data = days.map(day => {
    const counts = { day: `Día ${day.day}`, bajo: 0, medio: 0, alto: 0 };
    day.stops.forEach(stop => counts[toEffortLevel(stop.effort_level)]++);
    return counts;
  });

  return (
    <ChartPanel
      title="Esfuerzo por día"
      subtitle="Número de actividades por nivel de esfuerzo"
      kind="stacked"
      xKey="day"
      xLabel="Día"
      data={data}
      series={SERIES}
      exportable
    />
  );
}

import { ChartPanel } from "@/components/ChartPanel/ChartPanel";
import { EFFORT_LABEL } from "@/lib/activity";
import { toEffortLevel } from "@/lib/api/activities";
import type { ItineraryDay } from "@/lib/api/itineraries";

const EFFORT_SERIES = [
  { key: "low", label: EFFORT_LABEL.low, color: "effort-low" },
  { key: "medium", label: EFFORT_LABEL.medium, color: "effort-medium" },
  { key: "high", label: EFFORT_LABEL.high, color: "effort-high" },
];

type EffortChartProps = {
  days: ItineraryDay[];
  subtitle?: string;
};

export function EffortChart({ days, subtitle = "Número de actividades por nivel de esfuerzo" }: EffortChartProps) {
  const data = days.map(day => {
    const counts = { day: `Día ${day.day}`, low: 0, medium: 0, high: 0 };
    day.stops.forEach(stop => counts[toEffortLevel(stop.effort_level)]++);
    return counts;
  });

  return (
    <ChartPanel
      title="Esfuerzo por día"
      subtitle={subtitle}
      kind="stacked"
      xKey="day"
      xLabel="Día"
      data={data}
      series={EFFORT_SERIES}
      exportable
    />
  );
}

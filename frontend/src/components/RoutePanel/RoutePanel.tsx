import { useState } from "react";
import { Panel } from "@/components/Panel/Panel";
import { RouteTimeline } from "@/components/RouteTimeline/RouteTimeline";
import { Tabs } from "@/components/Tabs/Tabs";
import type { ItineraryDay } from "@/lib/api/itineraries";
import { dayLabel, maxDayEffort, toStops } from "@/lib/itinerary";

type RoutePanelProps = {
  days: ItineraryDay[];
  subtitle?: string;
};

// One day at a time, all on the busiest day's scale
export function RoutePanel({ days, subtitle }: RoutePanelProps) {
  const [day, setDay] = useState(String(days[0]?.day ?? ""));
  const current = days.find(item => String(item.day) === day) ?? days[0];
  const maxEffort = maxDayEffort(days);

  return (
    <Panel
      title="Orden de recorrido"
      subtitle={subtitle ?? `Misma escala en los ${days.length} días: ${maxEffort} puntos de esfuerzo.`}
    >
      <Tabs
        label="Días"
        items={days.map(item => ({ key: String(item.day), label: dayLabel(item) }))}
        value={current ? String(current.day) : undefined}
        onChange={setDay}
      />
      {current && <RouteTimeline stops={toStops(current)} maxEffort={maxEffort} label={dayLabel(current)} />}
    </Panel>
  );
}

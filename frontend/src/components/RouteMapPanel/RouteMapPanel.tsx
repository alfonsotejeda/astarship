import { useState } from "react";
import { AttractionMap } from "@/components/AttractionMap/AttractionMap";
import { Panel } from "@/components/Panel/Panel";
import { Tabs } from "@/components/Tabs/Tabs";
import type { Attraction } from "@/lib/api/attractions";
import type { ItineraryDay } from "@/lib/api/itineraries";
import { stopPoints } from "@/lib/attraction";

type RouteMapPanelProps = {
  days: ItineraryDay[];
  attractions: Attraction[];
  // The day shown first, 1-based
  initialDay?: number;
  // Marks the stop in progress; the rest are drawn muted
  currentActivityId?: number;
  // Tab labels; "Día N" by default
  dayLabel?: (day: ItineraryDay) => string;
  subtitle?: string;
};

// The day's stops on the map, joined in the order they are visited
export function RouteMapPanel({
  days,
  attractions,
  initialDay,
  currentActivityId,
  dayLabel = day => `Día ${day.day}`,
  subtitle = "Las atracciones de cada día, en el orden en que se recorren.",
}: RouteMapPanelProps) {
  const [day, setDay] = useState(String(initialDay ?? days[0]?.day ?? ""));
  const current = days.find(item => String(item.day) === day) ?? days[0];
  const points = current ? stopPoints(current.stops, attractions, currentActivityId) : [];

  return (
    <Panel title="Mapa del recorrido" subtitle={subtitle}>
      {days.length > 1 && (
        <Tabs
          label="Días del mapa"
          items={days.map(item => ({ key: String(item.day), label: dayLabel(item) }))}
          value={current ? String(current.day) : undefined}
          onChange={setDay}
        />
      )}
      <AttractionMap points={points} route label={current ? `Mapa del ${dayLabel(current).toLowerCase()}` : "Mapa"} />
    </Panel>
  );
}

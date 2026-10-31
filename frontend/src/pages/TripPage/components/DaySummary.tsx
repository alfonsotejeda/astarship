import { EffortSplit } from "@/components/ItineraryCard/EffortSplit";
import type { TripDay } from "@/lib/api/trips";
import { dayEffort, doneCount } from "../lib/trip";

export function DaySummary({ day }: { day: TripDay }) {
  return (
    <div className="trip__summary">
      <div className="trip__summary-item">
        <span className="trip__eyebrow">Hechas</span>
        <span className="trip__figure">
          {doneCount(day)} de {day.stops.length}
        </span>
      </div>
      <div className="trip__summary-item trip__summary-item--end">
        <span className="trip__eyebrow">Esfuerzo B · M · A</span>
        <EffortSplit effort={dayEffort(day)} />
      </div>
    </div>
  );
}

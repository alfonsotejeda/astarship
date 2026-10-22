import type { ReactNode } from "react";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import type { AssignmentStatus, ReviewStatus } from "@/components/StatusPill/StatusPill";
import { EffortSplit } from "./EffortSplit";
import type { EffortCount } from "./EffortSplit";
import "./ItineraryCard.css";

export type ItinerarySummary = {
  id: string;
  package: string;
  status?: ReviewStatus | AssignmentStatus;
  creator?: string;
  date?: string;
  days?: number;
  activities?: number;
  effort?: EffortCount;
  params?: string;
};

type ItineraryCardProps = {
  itinerary: ItinerarySummary;
  selected?: boolean;
  onClick?: () => void;
  actions?: ReactNode;
  className?: string;
};

export function ItineraryCard({ itinerary, selected = false, onClick, actions, className }: ItineraryCardProps) {
  const classes = [
    "itinerary-card",
    onClick && "itinerary-card--clickable",
    selected && "itinerary-card--selected",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      <div className="itinerary-card__head">
        <span className="itinerary-card__id">{itinerary.id}</span>
        {itinerary.status && <StatusPill status={itinerary.status} />}
      </div>

      {/* When clickable, the title is a button stretched over the whole card, so the actions can stay real buttons */}
      {onClick ? (
        <button
          type="button"
          className="itinerary-card__title itinerary-card__open"
          aria-current={selected || undefined}
          onClick={onClick}
        >
          {itinerary.package}
        </button>
      ) : (
        <div className="itinerary-card__title">{itinerary.package}</div>
      )}

      <div className="itinerary-card__meta">
        {itinerary.creator && <span>{itinerary.creator}</span>}
        {itinerary.date && <span className="itinerary-card__mono">{itinerary.date}</span>}
        {itinerary.days !== undefined && <span>{itinerary.days === 1 ? "1 día" : `${itinerary.days} días`}</span>}
        {itinerary.activities !== undefined && <span>{itinerary.activities} actividades</span>}
      </div>

      {itinerary.effort && (
        <div className="itinerary-card__row">
          <span className="itinerary-card__key">Esfuerzo</span>
          <EffortSplit effort={itinerary.effort} />
        </div>
      )}

      {itinerary.params && (
        <div className="itinerary-card__row">
          <span className="itinerary-card__key">Parámetros</span>
          <span className="itinerary-card__mono">{itinerary.params}</span>
        </div>
      )}

      {actions && <div className="itinerary-card__actions">{actions}</div>}
    </article>
  );
}

import type { KeyboardEvent, ReactNode } from "react";
import { Badge } from "@/components/Badge/Badge";
import type { ActivityType } from "@/components/Badge/Badge";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import { Icon } from "@/components/Icon/Icon";
import "@/components/Checkbox/Checkbox.css";
import "./ActivityRow.css";

export type Activity = {
  id?: string | number;
  name: string;
  attraction?: string;
  author?: string;
  type?: ActivityType;
  category?: string;
  effort?: EffortLevel;
  duration?: string;
};

type ActivityRowProps = {
  activity: Activity;
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  order?: number;
  orderable?: boolean;
  // Keyboard reordering from the grip: -1 moves up, 1 moves down
  onMove?: (direction: -1 | 1) => void;
  warning?: string;
  trailing?: ReactNode;
  className?: string;
};

function Grip({ name, onMove }: { name: string; onMove?: (direction: -1 | 1) => void }) {
  if (!onMove) {
    return (
      <span className="activity-row__grip" aria-hidden="true">
        <Icon name="grip" size={16} />
      </span>
    );
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    onMove?.(event.key === "ArrowUp" ? -1 : 1);
  }

  return (
    <button
      type="button"
      className="activity-row__grip activity-row__grip--button"
      aria-label={`Mover ${name}. Usa las flechas arriba y abajo`}
      onKeyDown={handleKeyDown}
    >
      <Icon name="grip" size={16} />
    </button>
  );
}

export function ActivityRow({
  activity,
  selected = false,
  onSelectChange,
  order,
  orderable = false,
  onMove,
  warning,
  trailing,
  className,
}: ActivityRowProps) {
  const isSelectable = onSelectChange !== undefined;
  const classes = [
    "activity-row",
    isSelectable && "activity-row--selectable",
    selected && "activity-row--selected",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {orderable && <Grip name={activity.name} onMove={onMove} />}
      {order !== undefined && <span className="activity-row__order">{order}</span>}

      {/* Same markup and styles as Checkbox; the whole row is its label */}
      {isSelectable && (
        <span className="checkbox">
          <input
            type="checkbox"
            className="checkbox__input"
            checked={selected}
            onChange={event => onSelectChange(event.target.checked)}
          />
          <span className="checkbox__box" aria-hidden="true">
            <Icon name="check" size={12} />
          </span>
        </span>
      )}

      <div className="activity-row__main">
        <div className="activity-row__name">{activity.name}</div>
        <div className="activity-row__sub">
          {activity.attraction && <span>{activity.attraction}</span>}
          {activity.author && <span>por {activity.author}</span>}
        </div>
      </div>

      <div className="activity-row__meta">
        {activity.type && <Badge tone={activity.type} />}
        {activity.category && <Badge tone="category">{activity.category}</Badge>}
        {activity.effort && <EffortMeter level={activity.effort} />}
        {activity.duration && <span className="activity-row__duration">{activity.duration}</span>}
      </div>

      {trailing && <div className="activity-row__trailing">{trailing}</div>}

      {warning && (
        <div className="activity-row__warning">
          <Icon name="alert" size={14} />
          {warning}
        </div>
      )}
    </>
  );

  if (isSelectable) return <label className={classes}>{content}</label>;
  return <div className={classes}>{content}</div>;
}

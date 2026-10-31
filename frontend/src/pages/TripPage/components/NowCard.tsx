import { Badge } from "@/components/Badge/Badge";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import { Icon } from "@/components/Icon/Icon";
import { toActivityType, toEffortLevel } from "@/lib/api/activities";
import type { TripStop } from "@/lib/api/trips";
import { formatDuration, formatTime } from "@/lib/format";
import { travelText } from "../lib/trip";

type NowCardProps = {
  stop: TripStop;
  previous?: TripStop;
};

export function NowCard({ stop, previous }: NowCardProps) {
  const type = toActivityType(stop.activity_type_code);
  const travel = travelText(stop, previous);

  return (
    <section className="trip__now" aria-labelledby="trip-now-title">
      <span className="trip__eyebrow trip__eyebrow--route">Ahora · {formatTime(stop.start_time)}</span>
      <h2 id="trip-now-title" className="trip__now-title">
        {stop.activity_name}
      </h2>
      {stop.attraction_name && (
        <span className="trip__line trip__muted">
          <Icon name="pin" size={14} />
          {stop.attraction_name}
        </span>
      )}
      <div className="trip__meta">
        {type && <Badge tone={type} />}
        <EffortMeter level={toEffortLevel(stop.effort_level)} />
        <span className="trip__mono trip__muted">{formatDuration(stop.duration_minutes)}</span>
      </div>
      {travel && (
        <span className="trip__line">
          <Icon name="route" size={14} />
          {travel}
        </span>
      )}
    </section>
  );
}

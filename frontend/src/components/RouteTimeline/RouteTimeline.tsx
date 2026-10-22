import { Badge } from "@/components/Badge/Badge";
import type { ActivityType } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import { Icon } from "@/components/Icon/Icon";
import { Rating } from "@/components/Rating/Rating";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import type { VisitStatus } from "@/components/StatusPill/StatusPill";
import "./RouteTimeline.css";

export type RouteStop = {
  id?: string | number;
  time?: string;
  name: string;
  place?: string;
  type?: ActivityType;
  effort?: EffortLevel;
  duration?: string;
  status?: VisitStatus;
  rating?: number;
};

type VisitResult = Exclude<VisitStatus, "pendiente">;

type RouteTimelineProps = {
  stops: RouteStop[];
  showCumulative?: boolean;
  maxEffort?: number;
  currentIndex?: number;
  onVisit?: (stop: RouteStop, status: VisitResult) => void;
  onRate?: (stop: RouteStop, rating: number) => void;
  label?: string;
  className?: string;
};

// Same scale as the reports: low 1, medium 2, high 3
const EFFORT_POINTS: Record<EffortLevel, number> = { bajo: 1, medio: 2, alto: 3 };

function cumulativeEffort(stops: RouteStop[]) {
  let total = 0;
  return stops.map(stop => (total += stop.effort ? EFFORT_POINTS[stop.effort] : 0));
}

function StopNode({ status }: { status: VisitStatus }) {
  return (
    <span className="route-timeline__node">
      {status === "realizada" && <Icon name="check" size={10} />}
      {status === "abandonada" && <Icon name="x" size={10} />}
    </span>
  );
}

function CumulativeEffort({ value, max }: { value: number; max: number }) {
  return (
    <div className="route-timeline__sum">
      <span className="route-timeline__sum-value" aria-hidden="true">
        {value}
      </span>
      <span className="route-timeline__sr">Esfuerzo acumulado: {value} puntos</span>
      <span className="route-timeline__sum-track" aria-hidden="true">
        <span className="route-timeline__sum-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
      </span>
    </div>
  );
}

export function RouteTimeline({
  stops,
  showCumulative = true,
  maxEffort,
  currentIndex,
  onVisit,
  onRate,
  label = "Orden de recorrido",
  className,
}: RouteTimelineProps) {
  const sums = cumulativeEffort(stops);
  const max = maxEffort ?? (sums.at(-1) || 1);
  const classes = ["route-timeline", !showCumulative && "route-timeline--no-sum", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      {showCumulative && (
        <div className="route-timeline__head" aria-hidden="true">
          <span>Hora</span>
          <span />
          <span>Actividad</span>
          <span>Esfuerzo acum.</span>
        </div>
      )}

      <ol className="route-timeline__list" aria-label={label}>
        {stops.map((stop, index) => {
          const status = stop.status ?? "pendiente";
          const isNow = currentIndex === index;
          // Without currentIndex every pending stop can be registered; with it, only the current one
          const canVisit = onVisit && status === "pendiente" && (isNow || currentIndex === undefined);
          const stopClasses = ["route-timeline__stop", `route-timeline__stop--${status}`, isNow && "route-timeline__stop--now"]
            .filter(Boolean)
            .join(" ");

          return (
            <li key={stop.id ?? index} className={stopClasses} aria-current={isNow ? "step" : undefined}>
              <span className="route-timeline__time">{stop.time}</span>

              <span className="route-timeline__rail" aria-hidden="true">
                <StopNode status={status} />
              </span>

              <div className="route-timeline__body">
                {isNow && <span className="route-timeline__now">Ahora</span>}
                <div className="route-timeline__name">{stop.name}</div>
                {stop.place && (
                  <div className="route-timeline__place">
                    <Icon name="pin" size={13} />
                    {stop.place}
                  </div>
                )}

                <div className="route-timeline__meta">
                  {stop.type && <Badge tone={stop.type} />}
                  {stop.effort && <EffortMeter level={stop.effort} />}
                  {stop.duration && <span className="route-timeline__duration">{stop.duration}</span>}
                  {!onVisit && status !== "pendiente" && <StatusPill status={status} />}
                  {!onVisit && stop.rating !== undefined && <Rating value={stop.rating} />}
                </div>

                {canVisit && (
                  <div className="route-timeline__visit">
                    <Button size="sm" variant="primary" icon="check" onClick={() => onVisit(stop, "realizada")}>
                      La hice
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onVisit(stop, "abandonada")}>
                      No la hice
                    </Button>
                  </div>
                )}

                {onVisit && status !== "pendiente" && (
                  <div className="route-timeline__visit">
                    <StatusPill status={status} />
                    {status === "realizada" && onRate && (
                      <Rating value={stop.rating ?? 0} onChange={rating => onRate(stop, rating)} label={`Valora ${stop.name}`} />
                    )}
                  </div>
                )}
              </div>

              {showCumulative && <CumulativeEffort value={sums[index]} max={max} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

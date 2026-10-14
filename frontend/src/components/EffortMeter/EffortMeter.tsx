import type { HTMLAttributes } from "react";
import "./EffortMeter.css";

export type EffortLevel = "bajo" | "medio" | "alto";

const LEVELS: Record<EffortLevel, { bars: number; label: string }> = {
  bajo: { bars: 1, label: "Bajo" },
  medio: { bars: 2, label: "Medio" },
  alto: { bars: 3, label: "Alto" },
};

type EffortMeterProps = HTMLAttributes<HTMLSpanElement> & {
  level: EffortLevel;
  showLabel?: boolean;
};

export function EffortMeter({ level, showLabel = true, className, ...rest }: EffortMeterProps) {
  const { bars, label } = LEVELS[level];
  const name = `Esfuerzo ${label.toLowerCase()}`;
  const classes = ["effort-meter", `effort-meter--${level}`, className].filter(Boolean).join(" ");

  return (
    <span className={classes} role="img" aria-label={name} title={showLabel ? undefined : name} {...rest}>
      <span className="effort-meter__bars" aria-hidden="true">
        {[1, 2, 3].map(i => (
          <span key={i} className={i <= bars ? "effort-meter__bar effort-meter__bar--on" : "effort-meter__bar"} />
        ))}
      </span>
      {showLabel && <span aria-hidden="true">{label}</span>}
    </span>
  );
}

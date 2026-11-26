import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import "./EffortSplit.css";

export type EffortCount = Record<EffortLevel, number>;

const LEVELS: { key: EffortLevel; color: string }[] = [
  { key: "low", color: "var(--effort-low)" },
  { key: "medium", color: "var(--effort-medium)" },
  { key: "high", color: "var(--effort-high)" },
];

export function EffortSplit({ effort }: { effort: EffortCount }) {
  const total = effort.low + effort.medium + effort.high || 1;

  return (
    <span
      className="effort-split"
      role="img"
      aria-label={`Esfuerzo: ${effort.low} bajo, ${effort.medium} medio, ${effort.high} alto`}
    >
      <span className="effort-split__bar">
        {LEVELS.map(level => (
          <span key={level.key} style={{ width: `${(effort[level.key] / total) * 100}%`, background: level.color }} />
        ))}
      </span>
      <span className="effort-split__count">
        {effort.low} · {effort.medium} · {effort.high}
      </span>
    </span>
  );
}

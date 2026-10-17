import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import "./EffortSplit.css";

export type EffortCount = Record<EffortLevel, number>;

const LEVELS: { key: EffortLevel; color: string }[] = [
  { key: "bajo", color: "var(--effort-low)" },
  { key: "medio", color: "var(--effort-medium)" },
  { key: "alto", color: "var(--effort-high)" },
];

export function EffortSplit({ effort }: { effort: EffortCount }) {
  const total = effort.bajo + effort.medio + effort.alto || 1;

  return (
    <span
      className="effort-split"
      role="img"
      aria-label={`Esfuerzo: ${effort.bajo} bajo, ${effort.medio} medio, ${effort.alto} alto`}
    >
      <span className="effort-split__bar">
        {LEVELS.map(level => (
          <span key={level.key} style={{ width: `${(effort[level.key] / total) * 100}%`, background: level.color }} />
        ))}
      </span>
      <span className="effort-split__count">
        {effort.bajo} · {effort.medio} · {effort.alto}
      </span>
    </span>
  );
}

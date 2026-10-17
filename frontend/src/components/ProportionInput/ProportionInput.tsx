import { useState } from "react";
import type { ActivityType } from "@/components/Badge/Badge";
import { Field } from "@/components/Field/Field";
import { Icon } from "@/components/Icon/Icon";
import "./ProportionInput.css";

export type Proportion = Record<ActivityType, number>;

type ProportionInputProps = {
  value?: Proportion;
  defaultValue?: Proportion;
  onChange?: (value: Proportion) => void;
  // Total activities, to show the approximate count per type
  total?: number;
  label?: string;
  id?: string;
  className?: string;
};

const TYPES: { key: ActivityType; label: string; color: string }[] = [
  { key: "visita", label: "Visita", color: "var(--destination)" },
  { key: "excursion", label: "Excursión", color: "var(--origin)" },
  { key: "taller", label: "Taller", color: "var(--workshop)" },
];

const DEFAULT_PROPORTION: Proportion = { visita: 40, excursion: 35, taller: 25 };

export function ProportionInput({
  value,
  defaultValue = DEFAULT_PROPORTION,
  onChange,
  total,
  label = "Proporción por tipo",
  id = "proportion",
  className,
}: ProportionInputProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const proportion = isControlled ? value : uncontrolledValue;

  const sum = TYPES.reduce((accumulated, type) => accumulated + proportion[type.key], 0);
  const isComplete = sum === 100;
  const classes = ["proportion-input", className].filter(Boolean).join(" ");

  function update(type: ActivityType, raw: string) {
    const next = { ...proportion, [type]: raw === "" ? 0 : Number(raw) };
    if (!isControlled) setUncontrolledValue(next);
    onChange?.(next);
  }

  return (
    <fieldset className={classes}>
      <legend className="proportion-input__legend">{label}</legend>

      {/* Over 100 % the bar scales down so the segments still fit */}
      <div className="proportion-input__bar" aria-hidden="true">
        {TYPES.map(type => (
          <span
            key={type.key}
            style={{ width: `${(proportion[type.key] / Math.max(sum, 100)) * 100}%`, background: type.color }}
          />
        ))}
      </div>

      <div className="proportion-input__fields">
        {TYPES.map(type => (
          <Field
            key={type.key}
            id={`${id}-${type.key}`}
            label={
              <span className="proportion-input__label">
                <span className="proportion-input__swatch" style={{ background: type.color }} />
                {type.label}
              </span>
            }
            type="number"
            min={0}
            max={100}
            step={5}
            suffix="%"
            value={proportion[type.key]}
            onChange={event => update(type.key, event.target.value)}
            hint={total ? `≈ ${Math.round((proportion[type.key] / 100) * total)} activ.` : undefined}
          />
        ))}
      </div>

      <div
        className={isComplete ? "proportion-input__sum proportion-input__sum--ok" : "proportion-input__sum proportion-input__sum--bad"}
        aria-live="polite"
      >
        <Icon name={isComplete ? "check" : "alert"} size={14} />
        {isComplete ? "Suma 100 %" : `Suma ${sum} %: ajusta hasta llegar a 100 %`}
      </div>
    </fieldset>
  );
}

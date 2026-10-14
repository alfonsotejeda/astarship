import { useState } from "react";
import { Icon } from "@/components/Icon/Icon";
import "./ChipSelect.css";

export type ChipOption = string | { value: string; label: string; count?: number };

type ChipSelectProps = {
  options: ChipOption[];
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  label?: string;
  className?: string;
};

function toOption(option: ChipOption) {
  return typeof option === "string" ? { value: option, label: option } : option;
}

export function ChipSelect({ options, value, defaultValue = [], onChange, label, className }: ChipSelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);

  const isControlled = value !== undefined;
  const selected = isControlled ? value : uncontrolledValue;
  const classes = ["chip-select", className].filter(Boolean).join(" ");

  function toggle(optionValue: string) {
    const next = selected.includes(optionValue)
      ? selected.filter(item => item !== optionValue)
      : [...selected, optionValue];

    if (!isControlled) setUncontrolledValue(next);
    onChange?.(next);
  }

  return (
    <div className={classes} role="group" aria-label={label}>
      {options.map(toOption).map(option => {
        const isSelected = selected.includes(option.value);

        return (
          <button
            key={option.value}
            type="button"
            className="chip-select__chip"
            aria-pressed={isSelected}
            onClick={() => toggle(option.value)}
          >
            {isSelected && <Icon name="check" size={14} />}
            {option.label}
            {option.count !== undefined && <span className="chip-select__count">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

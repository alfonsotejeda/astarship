import { useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "@/components/Icon/Icon";
import "./Checkbox.css";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: ReactNode;
  description?: string;
};

export function Checkbox({ label, description, className, ...rest }: CheckboxProps) {
  const descriptionId = useId();
  const classes = ["checkbox", rest.disabled && "checkbox--disabled", className].filter(Boolean).join(" ");

  return (
    <label className={classes}>
      <input
        type="checkbox"
        className="checkbox__input"
        aria-describedby={description ? descriptionId : undefined}
        {...rest}
      />
      <span className="checkbox__box" aria-hidden="true">
        <Icon name="check" size={12} />
      </span>
      {label && (
        <span className="checkbox__text">
          <span className="checkbox__label">{label}</span>
          {description && (
            <span id={descriptionId} className="checkbox__description">
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  );
}

import type { ChangeEventHandler, InputHTMLAttributes, ReactNode } from "react";
import "./Field.css";

export type FieldOption = string | { value: string; label: string };

type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

type FieldProps = Omit<InputHTMLAttributes<FieldElement>, "id" | "onChange"> & {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  options?: FieldOption[];
  multiline?: boolean;
  suffix?: string;
  onChange?: ChangeEventHandler<FieldElement>;
};

function toOption(option: FieldOption) {
  return typeof option === "string" ? { value: option, label: option } : option;
}

export function Field({ id, label, hint, error, options, multiline = false, suffix, className, ...rest }: FieldProps) {
  const messageId = `${id}-message`;
  const message = error ?? hint;
  const classes = ["field", error && "field--invalid", className].filter(Boolean).join(" ");

  const controlProps = {
    ...rest,
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": message ? messageId : undefined,
  };

  let control: ReactNode;
  if (options) {
    control = (
      <select {...controlProps} className="field__control field__control--select">
        {options.map(toOption).map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else if (multiline) {
    control = <textarea rows={4} {...controlProps} className="field__control field__control--textarea" />;
  } else {
    control = <input type="text" {...controlProps} className="field__control" />;
  }

  return (
    <div className={classes}>
      {label && (
        <label htmlFor={id} className="field__label">
          {label}
          {rest.required && (
            <span className="field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {suffix ? (
        <div className="field__suffix-wrap">
          {control}
          <span className="field__suffix">{suffix}</span>
        </div>
      ) : (
        control
      )}

      {message && (
        <span id={messageId} className={error ? "field__error" : "field__hint"}>
          {message}
        </span>
      )}
    </div>
  );
}

import type { HTMLAttributes } from "react";
import { Button } from "@/components/Button/Button";
import "./FilterBar.css";

type FilterBarProps = HTMLAttributes<HTMLDivElement> & {
  summary?: string;
  onReset?: () => void;
};

export function FilterBar({ summary, onReset, className, children, ...rest }: FilterBarProps) {
  const classes = ["filter-bar", className].filter(Boolean).join(" ");

  return (
    <div className={classes} role="search" {...rest}>
      <div className="filter-bar__fields">{children}</div>

      {(summary !== undefined || onReset) && (
        <div className="filter-bar__end">
          {/* Filters apply on change, so the result count is announced when it updates */}
          <span className="filter-bar__summary" aria-live="polite">
            {summary}
          </span>
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              Limpiar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

import type { HTMLAttributes, ReactNode } from "react";
import "./StatTile.css";

type StatTileProps = HTMLAttributes<HTMLDListElement> & {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: string;
  noteTone?: "ok" | "bad" | "warn";
};

// A <dl> so the label is read as the term and the figure as its value
export function StatTile({ label, value, unit, note, noteTone, className, children, ...rest }: StatTileProps) {
  const classes = ["stat-tile", className].filter(Boolean).join(" ");
  const noteClasses = ["stat-tile__note", noteTone && `stat-tile__note--${noteTone}`].filter(Boolean).join(" ");

  return (
    <dl className={classes} {...rest}>
      <dt className="stat-tile__label">{label}</dt>
      <dd className="stat-tile__value">
        {value}
        {unit && <span className="stat-tile__unit">{unit}</span>}
      </dd>
      {note && <dd className={noteClasses}>{note}</dd>}
      {children && <dd className="stat-tile__extra">{children}</dd>}
    </dl>
  );
}

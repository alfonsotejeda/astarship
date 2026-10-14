import type { HTMLAttributes } from "react";
import "./StatusPill.css";

export type ItineraryStatus = "generado" | "revision" | "aprobado" | "rehacer" | "asignado";
export type RequestStatus = "solicitada" | "atendiendo" | "resuelta" | "denegada";
export type VisitStatus = "pendiente" | "realizada" | "abandonada";
export type Status = ItineraryStatus | RequestStatus | VisitStatus;

type StatusTone = "info" | "warn" | "ok" | "bad" | "neutral";

const STATUSES: Record<Status, { label: string; tone: StatusTone }> = {
  generado: { label: "Generado", tone: "info" },
  revision: { label: "En revisión", tone: "warn" },
  aprobado: { label: "Aprobado", tone: "ok" },
  rehacer: { label: "Rehacer", tone: "bad" },
  asignado: { label: "Asignado", tone: "info" },
  solicitada: { label: "Solicitada", tone: "warn" },
  atendiendo: { label: "En atención", tone: "info" },
  resuelta: { label: "Resuelta", tone: "ok" },
  denegada: { label: "Denegada", tone: "bad" },
  pendiente: { label: "Pendiente", tone: "neutral" },
  realizada: { label: "Realizada", tone: "ok" },
  abandonada: { label: "No realizada", tone: "bad" },
};

type StatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  status: Status;
};

export function StatusPill({ status, className, children, ...rest }: StatusPillProps) {
  const { label, tone } = STATUSES[status];
  const classes = ["status-pill", `status-pill--${tone}`, className].filter(Boolean).join(" ");

  return (
    <span className={classes} {...rest}>
      <span className="status-pill__dot" aria-hidden="true" />
      {children ?? label}
    </span>
  );
}

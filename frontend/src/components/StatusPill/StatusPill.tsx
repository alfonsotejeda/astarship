import type { HTMLAttributes } from "react";
import "./StatusPill.css";

export type ReviewStatus = "pendiente" | "validado" | "aprobado" | "rechazado";
export type AssignmentStatus = "asignado" | "en_curso" | "finalizado";
export type RequestStatus = "solicitada" | "atendiendo" | "resuelta" | "denegada";
export type VisitStatus = "pendiente" | "realizada" | "abandonada";
export type Status = ReviewStatus | AssignmentStatus | RequestStatus | VisitStatus;

type StatusTone = "info" | "warn" | "ok" | "bad" | "neutral";

const STATUSES: Record<Status, { label: string; tone: StatusTone }> = {
  validado: { label: "Validado", tone: "info" },
  aprobado: { label: "Aprobado", tone: "ok" },
  rechazado: { label: "Rechazado", tone: "bad" },
  asignado: { label: "Asignado", tone: "info" },
  en_curso: { label: "En curso", tone: "warn" },
  finalizado: { label: "Finalizado", tone: "ok" },
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

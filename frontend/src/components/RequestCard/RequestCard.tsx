import type { ReactNode } from "react";
import { Icon } from "@/components/Icon/Icon";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import type { RequestStatus } from "@/components/StatusPill/StatusPill";
import "./RequestCard.css";

export type ModificationRequest = {
  id?: string;
  tourist: string;
  group?: string;
  itinerary: string;
  date?: string;
  description: string;
  supportGuide?: string;
  status?: RequestStatus;
  result?: string;
};

type RequestCardProps = {
  request: ModificationRequest;
  actions?: ReactNode;
  className?: string;
};

const CLOSED_STATUSES: RequestStatus[] = ["resuelta", "denegada"];

export function RequestCard({ request, actions, className }: RequestCardProps) {
  const isClosed = request.status !== undefined && CLOSED_STATUSES.includes(request.status);
  const classes = ["request-card", className].filter(Boolean).join(" ");

  return (
    <article className={classes}>
      <div className="request-card__head">
        <div>
          <div className="request-card__who">
            {request.tourist}
            {request.group && <span className="request-card__group"> · {request.group}</span>}
          </div>
          <div className="request-card__meta">
            <span>{request.itinerary}</span>
            {request.date && <span>{request.date}</span>}
          </div>
        </div>
        {request.status && <StatusPill status={request.status} />}
      </div>

      <p className="request-card__description">{request.description}</p>

      {request.supportGuide && (
        <div className="request-card__support">
          <Icon name="users" size={14} />
          Pide apoyo de <strong>{request.supportGuide}</strong>
        </div>
      )}

      {/* The outcome of the manual change only exists once the request is closed */}
      {isClosed && request.result && (
        <div className="request-card__result">
          <span className="request-card__result-label">Resultado</span>
          {request.result}
        </div>
      )}

      {actions && <div className="request-card__actions">{actions}</div>}
    </article>
  );
}

import { useId } from "react";
import { Icon } from "@/components/Icon/Icon";
import "./CriteriaCheck.css";

export type Criterion = {
  label: string;
  target: string;
  actual: string;
  ok: boolean;
  detail?: string;
};

type CriteriaCheckProps = {
  items: Criterion[];
  title?: string;
  className?: string;
};

function CriterionRow({ label, target, actual, ok, detail }: Criterion) {
  const tone = ok ? "ok" : "bad";

  return (
    <li className="criteria-check__item">
      {/* Filled check or hollow cross: the shape tells the result apart without color, and the word confirms it */}
      <span className={`criteria-check__mark criteria-check__mark--${tone}`} aria-hidden="true">
        <Icon name={ok ? "check" : "x"} size={12} />
      </span>

      <div className="criteria-check__main">
        <div className="criteria-check__label">{label}</div>
        {detail && <div className="criteria-check__detail">{detail}</div>}
      </div>

      <dl className="criteria-check__values">
        <dt>Pedido</dt>
        <dd>{target}</dd>
        <dt>Obtenido</dt>
        <dd className={ok ? undefined : "criteria-check__value--bad"}>{actual}</dd>
      </dl>

      <span className={`criteria-check__word criteria-check__word--${tone}`}>{ok ? "Cumple" : "No cumple"}</span>
    </li>
  );
}

export function CriteriaCheck({ items, title = "Criterios de equilibrio", className }: CriteriaCheckProps) {
  const titleId = useId();
  const met = items.filter(item => item.ok).length;
  const allMet = met === items.length;
  const classes = ["criteria-check", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <div className="criteria-check__head">
        <h3 id={titleId} className="criteria-check__title">
          {title}
        </h3>
        <span className={`criteria-check__summary criteria-check__summary--${allMet ? "ok" : "bad"}`}>
          {met} de {items.length} cumplidos
        </span>
      </div>

      <ul className="criteria-check__list" aria-labelledby={titleId}>
        {items.map(item => (
          <CriterionRow key={item.label} {...item} />
        ))}
      </ul>
    </div>
  );
}

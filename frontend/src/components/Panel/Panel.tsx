import { useId } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import "./Panel.css";

type PanelProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  footer?: ReactNode;
  flush?: boolean;
};

export function Panel({ title, subtitle, actions, footer, flush = false, className, children, ...rest }: PanelProps) {
  const titleId = useId();
  const hasHeader = title || actions;
  const classes = ["panel", flush && "panel--flush", className].filter(Boolean).join(" ");

  return (
    <section className={classes} aria-labelledby={title ? titleId : undefined} {...rest}>
      {hasHeader && (
        <div className="panel__header">
          <div>
            {title && (
              <h2 id={titleId} className="panel__title">
                {title}
              </h2>
            )}
            {subtitle && <p className="panel__subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="panel__actions">{actions}</div>}
        </div>
      )}

      <div className="panel__body">{children}</div>

      {footer && <div className="panel__footer">{footer}</div>}
    </section>
  );
}

import { useId } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/Button/Button";
import "./Drawer.css";

type DrawerProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title: string;
  // Under the title: badges, status
  meta?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

// The side panel of the Listado template, where a row is created or edited
export function Drawer({ title, meta, footer, onClose, className, children, ...rest }: DrawerProps) {
  const titleId = useId();
  const classes = ["drawer", className].filter(Boolean).join(" ");

  return (
    <aside className={classes} aria-labelledby={titleId} {...rest}>
      <div className="drawer__header">
        <div className="drawer__heading">
          <h2 id={titleId} className="drawer__title">
            {title}
          </h2>
          {meta}
        </div>
        <Button variant="ghost" size="sm" icon="x" aria-label="Cerrar" onClick={onClose} />
      </div>

      <div className="drawer__body">{children}</div>

      {footer && <div className="drawer__footer">{footer}</div>}
    </aside>
  );
}

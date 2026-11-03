import { useEffect, useId, useRef } from "react";
import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";
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
export function Drawer({ title, meta, footer, onClose, className, children, onKeyDown, ...rest }: DrawerProps) {
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const classes = ["drawer", className].filter(Boolean).join(" ");

  // It sits after the table, so focus jumps to it on open and goes back to whatever opened it on close
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    titleRef.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    onKeyDown?.(event);
    // A Dialog opened from the drawer handles its own Escape; React bubbles it here anyway
    const inDialog = event.target instanceof Element && event.target.closest("dialog");
    if (event.key === "Escape" && !event.defaultPrevented && !inDialog) {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <aside className={classes} aria-labelledby={titleId} onKeyDown={handleKeyDown} {...rest}>
      <div className="drawer__header">
        <div className="drawer__heading">
          <h2 id={titleId} ref={titleRef} className="drawer__title" tabIndex={-1}>
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

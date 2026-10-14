import { useEffect, useId, useRef } from "react";
import type { MouseEvent, ReactNode, SyntheticEvent } from "react";
import { Button } from "@/components/Button/Button";
import "./Dialog.css";

type DialogProps = {
  open: boolean;
  title: string;
  onClose?: () => void;
  actions?: ReactNode;
  size?: "md" | "lg";
  className?: string;
  children?: ReactNode;
};

// Built on the native <dialog>: showModal() makes the rest of the page inert (focus stays inside),
// handles Escape and returns focus to whatever opened it
export function Dialog({ open, title, onClose, actions, size = "md", className, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedBackdropRef = useRef(false);
  const titleId = useId();
  const classes = ["dialog", `dialog--${size}`, className].filter(Boolean).join(" ");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Escape fires "cancel": the parent decides whether it closes, since `open` is controlled
  function handleCancel(event: SyntheticEvent) {
    event.preventDefault();
    onClose?.();
  }

  // Clicks on the backdrop land on the <dialog> itself; the content is inside an inner box.
  // Both press and release must be on the backdrop, so dragging out of a field doesn't close it
  function handleMouseDown(event: MouseEvent) {
    pressedBackdropRef.current = event.target === event.currentTarget;
  }

  function handleClick(event: MouseEvent) {
    if (pressedBackdropRef.current && event.target === event.currentTarget) onClose?.();
  }

  return (
    <dialog
      ref={dialogRef}
      className={classes}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {open && (
        <div className="dialog__box">
          <div className="dialog__header">
            <h2 id={titleId} className="dialog__title">
              {title}
            </h2>
            {onClose && <Button variant="ghost" size="sm" icon="x" aria-label="Cerrar" onClick={onClose} />}
          </div>

          <div className="dialog__body">{children}</div>

          {actions && <div className="dialog__footer">{actions}</div>}
        </div>
      )}
    </dialog>
  );
}

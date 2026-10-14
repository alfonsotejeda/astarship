import { useEffect, useRef, useState } from "react";
import type { HTMLAttributes } from "react";
import { TONE_ICONS } from "@/components/Alert/tones";
import type { Tone } from "@/components/Alert/tones";
import { Icon } from "@/components/Icon/Icon";
import "./Toast.css";

type ToastProps = HTMLAttributes<HTMLDivElement> & {
  tone?: Tone;
  action?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
};

export function Toast({
  tone = "ok",
  action,
  onAction,
  onClose,
  duration = action ? 8000 : 5000,
  className,
  children,
  ...rest
}: ToastProps) {
  const [paused, setPaused] = useState(false);
  const onCloseRef = useRef(onClose);
  const classes = ["toast", className].filter(Boolean).join(" ");

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // The countdown stops while the pointer or focus is on the toast, so there is time to read it and press the action
  useEffect(() => {
    if (paused || !Number.isFinite(duration)) return;
    const timer = setTimeout(() => onCloseRef.current?.(), duration);
    return () => clearTimeout(timer);
  }, [paused, duration]);

  function handleAction() {
    onAction?.();
    onClose?.();
  }

  return (
    <div
      className={classes}
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      {...rest}
    >
      <span className={`toast__icon toast__icon--${tone}`}>
        <Icon name={TONE_ICONS[tone]} size={16} />
      </span>
      <span className="toast__text">{children}</span>
      {action && (
        <button type="button" className="toast__action" onClick={handleAction}>
          {action}
        </button>
      )}
    </div>
  );
}

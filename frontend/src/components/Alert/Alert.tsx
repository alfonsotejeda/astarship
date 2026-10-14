import type { HTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/Button/Button";
import { Icon } from "@/components/Icon/Icon";
import { TONE_ICONS } from "./tones";
import type { Tone } from "./tones";
import "./Alert.css";

type AlertProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  tone?: Tone;
  title?: string;
  action?: ReactNode;
  onDismiss?: () => void;
};

export function Alert({ tone = "info", title, action, onDismiss, className, children, ...rest }: AlertProps) {
  const classes = ["alert", `alert--${tone}`, className].filter(Boolean).join(" ");

  return (
    <div className={classes} role={tone === "bad" ? "alert" : "status"} {...rest}>
      <Icon name={TONE_ICONS[tone]} size={18} />

      <div className="alert__body">
        {title && <div className="alert__title">{title}</div>}
        {children && <div className="alert__text">{children}</div>}
      </div>

      {action && <div className="alert__action">{action}</div>}

      {onDismiss && <Button variant="ghost" size="sm" icon="x" aria-label="Cerrar aviso" onClick={onDismiss} />}
    </div>
  );
}

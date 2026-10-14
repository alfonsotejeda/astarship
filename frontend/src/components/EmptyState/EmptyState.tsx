import type { HTMLAttributes, ReactNode } from "react";
import { Icon } from "@/components/Icon/Icon";
import type { IconName } from "@/components/Icon/icons";
import "./EmptyState.css";

type EmptyStateProps = Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  icon?: IconName;
  title: string;
  action?: ReactNode;
};

export function EmptyState({ icon = "search", title, action, className, children, ...rest }: EmptyStateProps) {
  const classes = ["empty-state", className].filter(Boolean).join(" ");

  return (
    <div className={classes} {...rest}>
      <span className="empty-state__icon">
        <Icon name={icon} size={24} />
      </span>
      <p className="empty-state__title">{title}</p>
      {children && <p className="empty-state__text">{children}</p>}
      {action}
    </div>
  );
}

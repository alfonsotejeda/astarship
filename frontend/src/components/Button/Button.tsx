import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { Icon } from "@/components/Icon/Icon";
import type { IconName } from "@/components/Icon/icons";
import "./Button.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm";

type BaseProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName | ReactElement;
  block?: boolean;
};

type ButtonProps = BaseProps & (
  | { children: ReactNode }
  | { children?: undefined; "aria-label": string }
);

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  block = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "button",
    `button--${variant}`,
    size === "sm" && "button--sm",
    block && "button--block",
    !children && "button--icon",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button type="button" className={classes} {...rest}>
      {typeof icon === "string" ? <Icon name={icon} /> : icon}
      {children}
    </button>
  );
}

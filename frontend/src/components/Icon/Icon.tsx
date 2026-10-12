import { ICONS } from "./icons";
import type { IconName } from "./icons";
import "./Icon.css";

interface IconProps {
  name: IconName;
  size?: number;
  label?: string;
}

export function Icon({ name, size = 16, label }: IconProps) {
  const LucideIcon = ICONS[name];

  return (
    <LucideIcon
      className="icon"
      size={size}
      strokeWidth={1.75}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

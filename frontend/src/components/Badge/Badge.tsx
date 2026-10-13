import type { HTMLAttributes } from "react";
import "./Badge.css";

export type ActivityType = "visita" | "excursion" | "taller";
type BadgeTone = "neutral" | "category" | ActivityType;

const TYPE_LABELS: Record<string, string> = {
  visita: "Visita",
  excursion: "Excursión",
  taller: "Taller",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ tone = "neutral", className, children, ...rest }: BadgeProps) {
  const classes = ["badge", `badge--${tone}`, className].filter(Boolean).join(" ");

  return (
    <span className={classes} {...rest}>
      {children ?? TYPE_LABELS[tone]}
    </span>
  );
}

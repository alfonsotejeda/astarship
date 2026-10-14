import type { CSSProperties } from "react";
import "./Skeleton.css";

type SkeletonProps = {
  variant?: "block" | "stops";
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  count?: number;
  label?: string;
  className?: string;
};

function Block({ width = "100%", height = 14, round = false, className }: {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  round?: boolean;
  className?: string;
}) {
  const classes = ["skeleton", round && "skeleton--round", className].filter(Boolean).join(" ");
  return <span className={classes} aria-hidden="true" style={{ width, height }} />;
}

// Mimics RouteTimeline: time, node and two lines per stop
function Stops({ count, label }: { count: number; label: string }) {
  return (
    <div className="skeleton-stops" role="status" aria-busy="true">
      <span className="skeleton-stops__label">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton-stops__stop">
          <Block width={40} height={14} />
          <Block width={14} height={14} round />
          <span className="skeleton-stops__lines">
            <Block width="70%" height={16} />
            <Block width="45%" height={12} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function Skeleton({
  variant = "block",
  width,
  height,
  count = 4,
  label = "Cargando itinerario",
  className,
}: SkeletonProps) {
  if (variant === "stops") return <Stops count={count} label={label} />;
  return <Block width={width} height={height} className={className} />;
}

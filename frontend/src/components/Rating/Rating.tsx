import { useRef, useState } from "react";
import type { HTMLAttributes, KeyboardEvent } from "react";
import { Icon } from "@/components/Icon/Icon";
import { formatDecimal } from "@/lib/format";
import "./Rating.css";

type RatingProps = Omit<HTMLAttributes<HTMLSpanElement>, "onChange"> & {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: "md" | "lg";
  showValue?: boolean;
  label?: string;
};

type Fill = "full" | "half" | "none";

function getFill(value: number, star: number): Fill {
  const portion = value - (star - 1);
  if (portion >= 0.75) return "full";
  if (portion >= 0.25) return "half";
  return "none";
}

function Star({ fill, size }: { fill: Fill; size: number }) {
  return (
    <span className="rating__star" data-fill={fill}>
      <Icon name="star" size={size} />
      {fill === "half" && (
        <span className="rating__half">
          <Icon name="star" size={size} />
        </span>
      )}
    </span>
  );
}

function RatingValue({ value }: { value: number }) {
  return (
    <span className="rating__value" aria-hidden="true">
      {formatDecimal(value)}
    </span>
  );
}

export function Rating({
  value,
  onChange,
  max = 5,
  size = "md",
  showValue = false,
  label = "Valoración",
  className,
  ...rest
}: RatingProps) {
  const [hovered, setHovered] = useState(0);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const isInput = onChange !== undefined;
  const shownValue = isInput && hovered ? hovered : value;
  const selected = Math.round(value);
  const starSize = size === "lg" ? 28 : 16;
  const starNumbers = Array.from({ length: max }, (_, index) => index + 1);
  const classes = ["rating", `rating--${size}`, className].filter(Boolean).join(" ");

  function select(star: number) {
    const clamped = Math.min(Math.max(star, 1), max);
    onChange?.(clamped);
    buttonsRef.current[clamped - 1]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent, star: number) {
    const targets: Record<string, number> = {
      ArrowRight: star + 1,
      ArrowUp: star + 1,
      ArrowLeft: star - 1,
      ArrowDown: star - 1,
      Home: 1,
      End: max,
    };
    const target = targets[event.key];
    if (target === undefined) return;

    event.preventDefault();
    select(target);
  }

  if (!isInput) {
    return (
      <span className={classes} role="img" aria-label={`${label} ${formatDecimal(value)} de ${max}`} {...rest}>
        {starNumbers.map(star => (
          <Star key={star} fill={getFill(value, star)} size={starSize} />
        ))}
        {showValue && <RatingValue value={value} />}
      </span>
    );
  }

  return (
    <span className={classes} role="radiogroup" aria-label={label} onMouseLeave={() => setHovered(0)} {...rest}>
      {starNumbers.map(star => {
        // Only the selected star (or the first, if none) is reachable with Tab; arrows move between them
        const isTabStop = selected >= 1 ? star === selected : star === 1;

        return (
          <button
            key={star}
            ref={element => {
              buttonsRef.current[star - 1] = element;
            }}
            type="button"
            role="radio"
            className="rating__button"
            aria-checked={star === selected}
            aria-label={`${star} de ${max}`}
            tabIndex={isTabStop ? 0 : -1}
            onMouseEnter={() => setHovered(star)}
            onClick={() => select(star)}
            onKeyDown={event => handleKeyDown(event, star)}
          >
            <Star fill={getFill(shownValue, star)} size={starSize} />
          </button>
        );
      })}
      {showValue && <RatingValue value={value} />}
    </span>
  );
}

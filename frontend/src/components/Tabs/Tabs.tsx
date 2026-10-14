import { useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import "./Tabs.css";

export type TabItem = {
  key: string;
  label: string;
  count?: number;
};

type Indicator = {
  left: number;
  width: number;
};

type TabsProps = {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (key: string) => void;
  variant?: "underline" | "segmented";
  label?: string;
  className?: string;
};

export function Tabs({
  items,
  value,
  defaultValue = items[0]?.key,
  onChange,
  variant = "underline",
  label,
  className,
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [indicator, setIndicator] = useState<Indicator | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const isControlled = value !== undefined;
  const selected = isControlled ? value : uncontrolledValue;
  const selectedIndex = items.findIndex(item => item.key === selected);
  // Only one tab is reachable with Tab; arrows move between them
  const tabStop = selectedIndex >= 0 ? selected : items[0]?.key;
  const classes = ["tabs", `tabs--${variant}`, className].filter(Boolean).join(" ");

  // The indicator is a single element that slides to the selected tab, so it is measured from the DOM
  useLayoutEffect(() => {
    const list = listRef.current;
    const tab = tabsRef.current[selectedIndex];
    if (!list || !tab) {
      setIndicator(null);
      return;
    }

    const measure = () => setIndicator({ left: tab.offsetLeft, width: tab.offsetWidth });
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(list);
    observer.observe(tab);
    return () => observer.disconnect();
  }, [selectedIndex, items]);

  function select(index: number) {
    const key = items[index].key;
    if (!isControlled) setUncontrolledValue(key);
    onChange?.(key);
    tabsRef.current[index]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent, index: number) {
    const last = items.length - 1;
    const targets: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const target = targets[event.key];
    if (target === undefined) return;

    event.preventDefault();
    select(target);
  }

  return (
    <div ref={listRef} className={classes} role="tablist" aria-label={label}>
      {indicator && (
        <span
          className="tabs__indicator"
          aria-hidden="true"
          style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
        />
      )}
      {items.map((item, index) => {
        const isSelected = item.key === selected;

        return (
          <button
            key={item.key}
            ref={element => {
              tabsRef.current[index] = element;
            }}
            type="button"
            role="tab"
            className="tabs__tab"
            aria-selected={isSelected}
            tabIndex={item.key === tabStop ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={event => handleKeyDown(event, index)}
          >
            {item.label}
            {item.count !== undefined && <span className="tabs__count">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

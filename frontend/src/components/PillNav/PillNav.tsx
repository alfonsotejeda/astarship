import { useLayoutEffect, useRef, useState } from "react";
import type { HTMLAttributes } from "react";
import "./PillNav.css";

type Pill = {
  top: number;
  left: number;
  width: number;
  height: number;
};

// A <nav> whose active link (aria-current="page", as NavLink sets it) is marked by a pill that slides between links
export function PillNav({ className, children, ...rest }: HTMLAttributes<HTMLElement>) {
  const [pill, setPill] = useState<Pill | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    function measure() {
      const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
      setPill(
        active
          ? { top: active.offsetTop, left: active.offsetLeft, width: active.offsetWidth, height: active.offsetHeight }
          : null,
      );
    }
    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(nav);
    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(nav, { subtree: true, childList: true, attributeFilter: ["aria-current"] });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  const classes = ["pill-nav", className].filter(Boolean).join(" ");

  return (
    <nav ref={navRef} className={classes} {...rest}>
      {pill && (
        <span
          className="pill-nav__pill"
          aria-hidden="true"
          style={{
            transform: `translate(${pill.left}px, ${pill.top}px)`,
            width: pill.width,
            height: pill.height,
          }}
        />
      )}
      {children}
    </nav>
  );
}

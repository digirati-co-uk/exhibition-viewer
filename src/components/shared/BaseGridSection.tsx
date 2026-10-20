import { type HTMLAttributes, type ReactNode, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useIntersectionObserver } from "usehooks-ts";
import { useHashValue } from "@/helpers/use-hash-value";
import { getCanvasNavigationId } from "@/helpers/canvas-navigation";

const ACTIVE_VISIBILITY = 0.75;
// Fine-grained so the observer re-checks as a tall section scrolls through the viewport.
const VISIBILITY_THRESHOLDS = Array.from({ length: 21 }, (_, step) => step / 20);

/**
 * A section is active once 75% of it is visible, or once it fills 75% of the viewport. The second rule is needed
 * for sections taller than the viewport (e.g. long info blocks), which can never reach 75% of their own height.
 */
function isSectionActive(entry: IntersectionObserverEntry) {
  if (!entry.isIntersecting) return false;

  const viewportHeight = entry.rootBounds?.height ?? window.innerHeight;
  return (
    entry.intersectionRatio >= ACTIVE_VISIBILITY || entry.intersectionRect.height >= viewportHeight * ACTIVE_VISIBILITY
  );
}

interface BaseGridSectionProps extends HTMLAttributes<HTMLDivElement> {
  id: string;
  children: ReactNode;
  updatesTitle?: boolean;
  enabled?: boolean;
}

export function BaseGridSection({
  id,
  className,
  children,
  updatesTitle = true,
  enabled = true,
  ...props
}: BaseGridSectionProps) {
  const [, setHash] = useHashValue();
  const numericId = Number(id);
  const navigationId = id.startsWith("s") || Number.isNaN(numericId) ? id : getCanvasNavigationId(numericId);

  const [isActive, setIsActive] = useState(false);
  const wasActive = useRef(false);

  const [ref] = useIntersectionObserver({
    threshold: VISIBILITY_THRESHOLDS,
    root: null,
    rootMargin: "0px",
    onChange: (_, entry) => {
      const active = isSectionActive(entry);
      setIsActive(active);

      // Thresholds fire repeatedly while active, so only report when the section becomes active.
      if (enabled && updatesTitle && active && !wasActive.current) {
        setHash(navigationId);
      }
      wasActive.current = active;
    },
  });

  return (
    <section
      data-visible={isActive}
      id={navigationId}
      ref={ref}
      data-step-id={id}
      className={`scroll-m-8 ${className}`}
      {...props}
    >
      {children}
    </section>
  );
}

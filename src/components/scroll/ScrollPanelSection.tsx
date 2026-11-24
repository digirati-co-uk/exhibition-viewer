import { useLazyMount } from "@/helpers/use-lazy-mount";
import { type ReactNode, useEffect } from "react";
import { twMerge } from "tailwind-merge";

export interface ScrollPanelSectionProps {
  id?: string;
  /** Which side the text panel sits on from `lg`. Below `lg` the panel always follows the viewer. */
  side?: "left" | "right";
  /** Width of the text panel from `lg`, as a CSS length. */
  panelWidth?: string;
  /** Mounted one viewport ahead of the scroll position; keep Atlas viewers here. */
  renderViewer: () => ReactNode;
  /** Called when the viewer scrolls far enough away to unmount, so callers can drop their Atlas runtime. */
  onViewerUnmount?: () => void;
  /** Text panel contents. The section grows to fit them rather than scrolling inside the panel. */
  children: ReactNode;
  className?: string;
  panelClassName?: string;
}

const PANEL_WIDTH_CLASSES: Record<string, string> = {
  "24rem": "lg:grid-cols-[minmax(0,1fr)_24rem]",
  "420px": "lg:grid-cols-[minmax(0,1fr)_420px]",
};

const PANEL_WIDTH_CLASSES_LEFT: Record<string, string> = {
  "24rem": "lg:grid-cols-[24rem_minmax(0,1fr)]",
  "420px": "lg:grid-cols-[420px_minmax(0,1fr)]",
};

/**
 * A viewer beside a text panel, used by the manual tour, compact deck and image details blocks. The viewer stays
 * pinned under the sticky header while a long panel scrolls past it, so nothing scrolls inside a fixed-height box.
 */
export function ScrollPanelSection({
  id,
  side = "right",
  panelWidth = "420px",
  renderViewer,
  onViewerUnmount,
  children,
  className,
  panelClassName,
}: ScrollPanelSectionProps) {
  const [ref, shouldMount] = useLazyMount();
  useEffect(() => {
    if (!shouldMount) onViewerUnmount?.();
  }, [shouldMount, onViewerUnmount]);
  const columns = (side === "left" ? PANEL_WIDTH_CLASSES_LEFT : PANEL_WIDTH_CLASSES)[panelWidth];

  return (
    <section
      id={id}
      className={twMerge(
        "relative grid min-h-[var(--exv-screen,100vh)] bg-InfoBlock text-InfoBlockText",
        columns,
        className,
      )}
    >
      <div ref={ref} className={twMerge("relative min-w-0", side === "left" && "lg:order-2")}>
        <div className="relative h-[calc(58*var(--exv-vh,1vh))] lg:sticky lg:top-[var(--exv-scroll-header-height,0px)] lg:h-[calc(var(--exv-screen,100vh)-var(--exv-scroll-header-height,0px))]">
          {shouldMount ? renderViewer() : null}
        </div>
      </div>
      <aside
        className={twMerge(
          "flex min-w-0 flex-col border-t border-ControlBarBorder p-5 lg:border-t-0 lg:p-8",
          side === "left" ? "lg:order-1 lg:border-r" : "lg:border-l",
          panelClassName,
        )}
      >
        {children}
      </aside>
    </section>
  );
}

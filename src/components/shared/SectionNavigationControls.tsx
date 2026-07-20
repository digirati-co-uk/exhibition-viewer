import { DownIcon } from "@/components/icons/DownIcon";
import { UpIcon } from "@/components/icons/UpIcon";
import { getCanvasNavigationId } from "@/helpers/canvas-navigation";
import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import { useManifest } from "react-iiif-vault";

export interface SectionNavigationControlsProps {
  containerRef: RefObject<HTMLElement | null>;
  disabled?: boolean;
}

function getSections(container: HTMLElement | null, canvasCount: number) {
  if (!container) return [];

  return Array.from({ length: canvasCount }, (_, canvasIndex) => {
    const element = container.querySelector<HTMLElement>(`#${getCanvasNavigationId(canvasIndex)}`);
    return element ? [element, ...Array.from(element.querySelectorAll<HTMLElement>("[data-step-id]"))] : [];
  }).flat();
}

function getCurrentSectionIndex(sections: HTMLElement[]) {
  const viewportMiddle = window.innerHeight / 2;
  let currentIndex = 0;

  sections.forEach((element, index) => {
    if (element.getBoundingClientRect().top <= viewportMiddle) {
      currentIndex = index;
    }
  });

  return currentIndex;
}

export function SectionNavigationControls({ containerRef, disabled = false }: SectionNavigationControlsProps) {
  const manifest = useManifest();
  const canvasCount = manifest?.items?.length || 0;
  const [state, setState] = useState({
    isVisible: false,
    currentIndex: 0,
    sectionCount: 0,
  });

  useEffect(() => {
    if (disabled) {
      setState({ isVisible: false, currentIndex: 0, sectionCount: 0 });
      return;
    }

    let frame = 0;

    function updateState() {
      frame = 0;

      const sections = getSections(containerRef.current, canvasCount);
      setState({
        isVisible: sections.length > 1,
        currentIndex: sections.length ? getCurrentSectionIndex(sections) : 0,
        sectionCount: sections.length,
      });
    }

    function requestUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(updateState);
    }

    updateState();
    const observer = new MutationObserver(requestUpdate);
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true });
    }
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      observer.disconnect();
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [containerRef, disabled, canvasCount]);

  const canGoPrevious = state.currentIndex > 0;
  const canGoNext = state.currentIndex < state.sectionCount - 1;
  const sections = getSections(containerRef.current, canvasCount);
  const previousId = sections[state.currentIndex - 1]?.id;
  const nextId = sections[state.currentIndex + 1]?.id;

  if (!state.isVisible) {
    return null;
  }

  return (
    <div
      className="fixed top-1/2 transform -translate-y-1/2 right-4 z-50 flex flex-col gap-2"
    >
      <a
        className={buttonClassName(!canGoPrevious)}
        aria-label="Previous canvas or tour step"
        aria-disabled={!canGoPrevious || undefined}
        href={canGoPrevious ? `#${previousId}` : undefined}
      >
        <UpIcon />
      </a>
      <a
        className={buttonClassName(!canGoNext)}
        aria-label="Next canvas or tour step"
        aria-disabled={!canGoNext || undefined}
        href={canGoNext ? `#${nextId}` : undefined}
      >
        <DownIcon />
      </a>
    </div>
  );
}

function buttonClassName(disabled: boolean): string {
  return [
    "flex w-9 h-9 items-center justify-center rounded-sm p-1.5",
    "border border-[color:var(--delft-control-bar-border)]",
    "text-[color:var(--delft-close-text)]",
    "bg-[color:var(--delft-control-bar)]",
    "opacity-90 hover:opacity-100 active:scale-95",
    "focus:outline-none focus-visible:ring-2 focus:ring-[color:var(--delft-control-bar-border)]",
    "transition-opacity transition-colors transition-transform duration-[160ms] ease-in-out",
    disabled
      ? "cursor-not-allowed opacity-35"
      : "cursor-pointer opacity-100 hover:bg-[color:var(--delft-control-bar-hover,var(--delft-control-bar))] hover:border-[color:var(--delft-close-text)]",
  ].join(" ");
}

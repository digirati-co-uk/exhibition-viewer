import { DownIcon } from "@/components/icons/DownIcon";
import { UpIcon } from "@/components/icons/UpIcon";
import { getCanvasNavigationHref, getCanvasNavigationId } from "@/helpers/canvas-navigation";
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
    return element ? { canvasIndex, element } : null;
  }).filter((section): section is { canvasIndex: number; element: HTMLElement } => Boolean(section));
}

function getCurrentSectionIndex(sections: { element: HTMLElement }[]) {
  const viewportMiddle = window.innerHeight / 2;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  sections.forEach(({ element }, index) => {
    const rect = element.getBoundingClientRect();
    const sectionMiddle = rect.top + rect.height / 2;
    const distance = Math.abs(sectionMiddle - viewportMiddle);

    if (distance < closestDistance) {
      closestIndex = index;
      closestDistance = distance;
    }
  });

  return closestIndex;
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
  const previousCanvasIndex = sections[state.currentIndex - 1]?.canvasIndex;
  const nextCanvasIndex = sections[state.currentIndex + 1]?.canvasIndex;

  if (!state.isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        top: "50%",
        zIndex: 60,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transform: "translateY(-50%)",
      }}
    >
      <a
        aria-label="Previous canvas"
        aria-disabled={!canGoPrevious || undefined}
        href={canGoPrevious ? getCanvasNavigationHref(previousCanvasIndex!) : undefined}
        style={buttonStyle(!canGoPrevious)}
      >
        <UpIcon />
      </a>
      <a
        aria-label="Next canvas"
        aria-disabled={!canGoNext || undefined}
        href={canGoNext ? getCanvasNavigationHref(nextCanvasIndex!) : undefined}
        style={buttonStyle(!canGoNext)}
      >
        <DownIcon />
      </a>
    </div>
  );
}

function buttonStyle(disabled: boolean): CSSProperties {
  return {
    display: "flex",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid var(--delft-control-bar-border)",
    borderRadius: 2,
    color: "var(--delft-close-text)",
    background: "var(--delft-control-bar)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.35 : 1,
    transition: "opacity 160ms ease, background 160ms ease",
  };
}

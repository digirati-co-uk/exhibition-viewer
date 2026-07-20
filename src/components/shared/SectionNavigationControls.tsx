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
        aria-label="Previous canvas or tour step"
        aria-disabled={!canGoPrevious || undefined}
        href={canGoPrevious ? `#${previousId}` : undefined}
        style={buttonStyle(!canGoPrevious)}
      >
        <UpIcon />
      </a>
      <a
        aria-label="Next canvas or tour step"
        aria-disabled={!canGoNext || undefined}
        href={canGoNext ? `#${nextId}` : undefined}
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

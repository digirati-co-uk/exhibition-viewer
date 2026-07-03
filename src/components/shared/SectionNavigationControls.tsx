import { DownIcon } from "@/components/icons/DownIcon";
import { UpIcon } from "@/components/icons/UpIcon";
import { useEffect, useState, type CSSProperties, type RefObject } from "react";

export interface SectionNavigationControlsProps {
  containerRef: RefObject<HTMLElement | null>;
  disabled?: boolean;
}

function getSections(container: HTMLElement | null) {
  return Array.from(container?.querySelectorAll<HTMLElement>("[data-step-id]") || []);
}

function getCurrentSectionIndex(sections: HTMLElement[]) {
  const viewportMiddle = window.innerHeight / 2;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  sections.forEach((section, index) => {
    const rect = section.getBoundingClientRect();
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

      const sections = getSections(containerRef.current);
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
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [containerRef, disabled]);

  function scrollToSection(index: number) {
    const sections = getSections(containerRef.current);
    sections[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const canGoPrevious = state.currentIndex > 0;
  const canGoNext = state.currentIndex < state.sectionCount - 1;

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
      <button
        type="button"
        aria-label="Previous section"
        disabled={!canGoPrevious}
        onClick={() => scrollToSection(state.currentIndex - 1)}
        style={buttonStyle(!canGoPrevious)}
      >
        <UpIcon />
      </button>
      <button
        type="button"
        aria-label="Next section"
        disabled={!canGoNext}
        onClick={() => scrollToSection(state.currentIndex + 1)}
        style={buttonStyle(!canGoNext)}
      >
        <DownIcon />
      </button>
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

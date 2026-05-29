import { useEffect, useState, type RefObject } from "react";

export interface ScrollProgressBarProps {
  containerRef: RefObject<HTMLElement | null>;
}

function clampProgress(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function ScrollProgressBar({ containerRef }: ScrollProgressBarProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    function updateProgress() {
      frame = 0;

      const container = containerRef.current;
      if (!container) {
        setProgress(0);
        return;
      }

      const rect = container.getBoundingClientRect();
      const scrollableDistance = container.scrollHeight - window.innerHeight;

      if (scrollableDistance <= 0) {
        setProgress(1);
        return;
      }

      setProgress(clampProgress(-rect.top / scrollableDistance));
    }

    function requestUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(updateProgress);
    }

    updateProgress();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, [containerRef]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        height: 4,
        pointerEvents: "none",
        background: "rgba(0, 0, 0, 0.2)",
      }}
    >
      <div
        style={{
          height: "100%",
          transform: `scaleX(${progress})`,
          transformOrigin: "left",
          transition: "transform 100ms linear",
          background: "var(--delft-progress-bar)",
        }}
      />
    </div>
  );
}

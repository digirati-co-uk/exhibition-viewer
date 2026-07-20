import { TopIcon } from "@/components/icons/TopIcon";
import { useEffect, useState, type RefObject } from "react";

export interface ScrollToTopButtonProps {
  containerRef: RefObject<HTMLElement | null>;
  href?: string;
}

export function ScrollToTopButton({ containerRef, href = "#top" }: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let frame = 0;

    function updateVisibility() {
      frame = 0;

      const container = containerRef.current;
      if (!container) {
        setIsVisible(false);
        return;
      }

      const rect = container.getBoundingClientRect();
      setIsVisible(-rect.top > window.innerHeight * 0.75);
    }

    function requestUpdate() {
      if (frame) return;
      frame = window.requestAnimationFrame(updateVisibility);
    }

    updateVisibility();
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
    <a
      aria-label="Scroll to top"
      href={href}
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 60,
        display: "flex",
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid rgba(255, 255, 255, 0.28)",
        borderRadius: 999,
        color: "var(--delft-close-text)",
        background: "var(--delft-close-background)",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.28)",
        cursor: "pointer",
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? "auto" : "none",
        transform: isVisible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 160ms ease, transform 160ms ease, background 160ms ease",
      }}
    >
      <TopIcon />
    </a>
  );
}

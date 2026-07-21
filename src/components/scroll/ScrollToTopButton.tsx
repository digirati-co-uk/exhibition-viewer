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
      className={[
        "fixed right-6 bottom-6 z-[60]",
        "flex w-11 h-11 items-center justify-center rounded-full p-1",
        "border border-[color:var(--delft-control-bar-border)]",
        "text-[color:var(--delft-close-text)]",
        "bg-[color:var(--delft-close-background)]",
        "shadow-[0_12px_32px_rgba(0,0,0,0.28)]",
        "cursor-pointer transition-[opacity,transform] duration-[160ms] ease-in-out",
        isVisible ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none translate-y-2",
      ].join(" ")}
    >
      <TopIcon className="w-5 h-5" />
    </a>
  );
}

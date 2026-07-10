import { CollapseUpIcon } from "@/components/icons/CollapseUpIcon";
import { ExpandDownIcon } from "@/components/icons/ExpandDownIcon";
import { TableOfContents } from "@/components/shared/TableOfContents";
import { useEffect, useState, type RefObject } from "react";
import { LocaleString, useManifest, useVault } from "react-iiif-vault";

export interface ScrollProgressBarProps {
  containerRef: RefObject<HTMLElement | null>;
  enabledCanvasId?: string;
  showProgress?: boolean;
  showTableOfContents?: boolean;
}

function clampProgress(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function ScrollProgressBar({
  containerRef,
  enabledCanvasId,
  showProgress = true,
  showTableOfContents = false,
}: ScrollProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const manifest = useManifest();
  const vault = useVault();
  const items = (manifest?.items || []).map((item) => ({
    id: item.id,
    canvasId: item.id,
    label: vault.get(item)?.label,
  }));
  const hasTableOfContents = showTableOfContents && items.some((item) => item.label);

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

  if (!showProgress && !hasTableOfContents) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        color: "var(--delft-close-text)",
        background: "var(--delft-control-bar)",
        boxShadow: isOpen ? "0 16px 36px rgba(0, 0, 0, 0.2)" : "none",
      }}
    >
      {hasTableOfContents ? (
        <>
          <button
            type="button"
            aria-expanded={isOpen}
            aria-controls="exv-scroll-progress-toc"
            onClick={() => setIsOpen((current) => !current)}
            style={{
              display: "flex",
              width: "100%",
              minHeight: 40,
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              border: 0,
              padding: "0 16px",
              color: "inherit",
              background: "transparent",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {manifest?.label ? <LocaleString>{manifest.label}</LocaleString> : "Table of contents"}
            </span>
            {isOpen ? <CollapseUpIcon /> : <ExpandDownIcon />}
          </button>
          <div
            id="exv-scroll-progress-toc"
            aria-hidden={!isOpen}
            style={{
              maxHeight: isOpen ? "min(55vh, 28rem)" : 0,
              overflowY: "auto",
              borderTop: "1px solid var(--delft-control-bar-border)",
              padding: isOpen ? "20px 24px 24px" : "0 24px",
              background: "var(--delft-control-bar)",
              opacity: isOpen ? 1 : 0,
              pointerEvents: isOpen ? "auto" : "none",
              transform: isOpen ? "translateY(0)" : "translateY(-8px)",
              transition:
                "max-height 220ms ease, opacity 180ms ease, padding 220ms ease, transform 220ms ease",
            }}
          >
            <div style={{ margin: "0 auto", maxWidth: 960 }}>
              <TableOfContents
                items={items}
                treeLabel={manifest?.summary || manifest?.label}
                enabledCanvasId={enabledCanvasId}
              />
            </div>
          </div>
        </>
      ) : null}
      {showProgress ? (
        <div
          aria-hidden="true"
          style={{
            height: 4,
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
      ) : null}
    </div>
  );
}

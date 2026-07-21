import { CollapseUpIcon } from "@/components/icons/CollapseUpIcon";
import { ExpandDownIcon } from "@/components/icons/ExpandDownIcon";
import { TableOfContents } from "@/components/shared/TableOfContents";
import { useEffect, useRef, useState, type RefObject } from "react";
import { DismissButton, FocusScope, mergeProps, useDialog, useOverlay } from "react-aria";
import { LocaleString, useManifest, useVault } from "react-iiif-vault";

export interface ScrollProgressBarProps {
  containerRef: RefObject<HTMLElement | null>;
  enabledCanvasId?: string;
  showProgress?: boolean;
  showTableOfContents?: boolean;
  showManifestDetails?: boolean;
}

function clampProgress(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function ScrollProgressBar({
  containerRef,
  enabledCanvasId,
  showProgress = true,
  showTableOfContents = false,
  showManifestDetails = true,
}: ScrollProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const manifest = useManifest();
  const vault = useVault();
  const items = (manifest?.items || []).map((item) => ({
    id: item.id,
    canvasId: item.id,
    label: vault.get(item)?.label,
  }));
  const hasTableOfContents = showTableOfContents && items.some((item) => item.label);
  const close = () => setIsOpen(false);
  const { overlayProps } = useOverlay(
    {
      isOpen,
      onClose: close,
      isDismissable: true,
      shouldCloseOnInteractOutside: (element) => !triggerRef.current?.contains(element),
    },
    overlayRef,
  );
  const { dialogProps } = useDialog({ "aria-label": "Table of contents" }, overlayRef);

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
    <>
      <div aria-hidden="true" />
      <div
        className="exv-scroll-progress"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          color: "var(--delft-control-bar-text)",
          background: "var(--delft-control-bar)",
          boxShadow: isOpen ? "0 16px 36px rgba(0, 0, 0, 0.2)" : "none",
        }}
      >
        {hasTableOfContents ? (
          <>
            <button
              ref={triggerRef}
              type="button"
              aria-expanded={isOpen}
              aria-haspopup="dialog"
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
              <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "var(--delft-title-transform)" }}>
                {manifest?.label ? <LocaleString>{manifest.label}</LocaleString> : "Table of contents"}
              </span>
              <span aria-hidden="true">{isOpen ? <CollapseUpIcon /> : <ExpandDownIcon />}</span>
            </button>
            {isOpen ? (
              <FocusScope contain restoreFocus autoFocus>
                <div
                  {...mergeProps(overlayProps, dialogProps)}
                  ref={overlayRef}
                  id="exv-scroll-progress-toc"
                  onClick={(event) => {
                    if ((event.target as Element).closest("a[href^='#']")) close();
                  }}
                  style={{
                    maxHeight: "min(55vh, 28rem)",
                    overflowY: "auto",
                    borderTop: "1px solid var(--delft-control-bar-border)",
                    padding: "20px 24px 24px",
                    background: "var(--delft-control-bar)",
                  }}
                >
                  <DismissButton onDismiss={close} />
                  <div style={{ margin: "0 auto", maxWidth: 960 }}>
                    <TableOfContents
                      items={items}
                      treeLabel={manifest?.summary || manifest?.label}
                      enabledCanvasId={enabledCanvasId}
                      showManifestDetails={showManifestDetails}
                    />
                  </div>
                  <DismissButton onDismiss={close} />
                </div>
              </FocusScope>
            ) : null}
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
    </>
  );
}

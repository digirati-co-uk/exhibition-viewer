import { type RefObject, useEffect, useState } from "react";

/** Below this viewer width the captions sit over the whole image, so the camera stays centred. */
export const CAPTION_CLEARANCE_MIN_WIDTH = 768;
/** Captions never reserve more than this share of the viewer. */
const MAX_CAPTION_SHARE = 0.45;
const DEFAULT_CAPTION_GAP = 20;
/** Space kept clear on every edge of the framed region, in screen pixels. */
export const TOUR_BASE_PADDING_PX = 48;

export interface CameraPadding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Signed horizontal clearance each caption needs: positive for a caption on the left (the camera shifts right),
 * negative for one on the right. Measured from the real caption boxes so margins and widths come from the theme.
 */
function measureInsets(viewport: HTMLElement, panels: HTMLElement[], hasRegion: (index: number) => boolean) {
  const viewportRect = viewport.getBoundingClientRect();
  if (viewportRect.width < CAPTION_CLEARANCE_MIN_WIDTH) return [];

  // `--exv-scroll-caption-gap` is a pixel length.
  const gap =
    Number.parseFloat(getComputedStyle(viewport).getPropertyValue("--exv-scroll-caption-gap")) || DEFAULT_CAPTION_GAP;
  const maxInset = viewportRect.width * MAX_CAPTION_SHARE;

  return panels.map((panel, index) => {
    if (!hasRegion(index)) return 0;
    const rect = panel.getBoundingClientRect();
    if (!rect.width) return 0;

    if (panel.dataset.scrollTourCaption === "right") {
      return -Math.round(Math.min(viewportRect.right - rect.left + gap, maxInset));
    }
    return Math.round(Math.min(rect.right - viewportRect.left + gap, maxInset));
  });
}

/**
 * Measures how far each tour caption intrudes into the viewer so the camera can frame the subject beside it.
 * Returns `[]` while disabled or on narrow viewers.
 */
export function useCaptionInsets({
  enabled,
  viewportRef,
  captionsRef,
  hasRegion,
  deps,
}: {
  enabled: boolean;
  viewportRef: RefObject<HTMLElement | null>;
  captionsRef: RefObject<HTMLElement | null>;
  hasRegion: (index: number) => boolean;
  /** Anything that should trigger a re-measure, for example the tour steps. */
  deps: unknown[];
}) {
  const [insets, setInsets] = useState<number[]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `hasRegion` is read through the caller's `deps`.
  useEffect(() => {
    const viewport = viewportRef.current;
    const list = captionsRef.current;
    if (!enabled || !viewport || !list) {
      setInsets((current) => (current.length ? [] : current));
      return;
    }

    const panels = Array.from(list.querySelectorAll<HTMLElement>("[data-scroll-tour-caption]"));
    const update = () => {
      const next = measureInsets(viewport, panels, hasRegion);
      setInsets((current) =>
        current.length === next.length && current.every((inset, index) => inset === next[index]) ? current : next,
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    for (const panel of panels) observer.observe(panel);
    return () => observer.disconnect();
  }, [enabled, viewportRef, captionsRef, ...deps]);

  return insets;
}

/**
 * Camera padding while moving from the previous stop's caption to the current one. Both the clearance and the plain
 * framing go through this, so every tour frames with the same screen-pixel margins.
 */
export function getTourCameraPadding(insets: number[], currentIndex: number, progress: number): CameraPadding {
  const from = insets[currentIndex - 1] ?? 0;
  const to = insets[currentIndex] ?? 0;
  const t = Math.min(1, Math.max(0, progress));
  const blend = (a: number, b: number) => Math.max(a, 0) * (1 - t) + Math.max(b, 0) * t;

  return {
    left: TOUR_BASE_PADDING_PX + blend(from, to),
    right: TOUR_BASE_PADDING_PX + blend(-from, -to),
    top: TOUR_BASE_PADDING_PX,
    bottom: TOUR_BASE_PADDING_PX,
  };
}

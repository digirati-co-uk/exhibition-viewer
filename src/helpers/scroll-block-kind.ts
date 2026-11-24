export type ScrollBlockKind = "image-details" | "compact-deck" | "tour" | "image";

/**
 * Chooses the scroll block for an image canvas. Tour variants (scroll-driven, manual, non-linear) are all `tour`;
 * `ScrollTourBlock` picks between them. Layout behaviours that need annotations fall back to a plain image block
 * when the canvas has none, rather than rendering an empty tour.
 */
export function getScrollBlockKind(behavior: readonly string[] | undefined, hasAnnotations: boolean): ScrollBlockKind {
  if (behavior?.includes("image-details")) return "image-details";
  if (!hasAnnotations) return "image";
  if (behavior?.includes("compact-deck")) return "compact-deck";
  return "tour";
}

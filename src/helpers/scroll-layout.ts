import { getFloatingFromBehaviours } from "@/helpers/exhibition";

type ScrollLayoutMode = "none" | "split" | "floating";

type ScrollFloatingPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top"
  | "bottom"
  | "left"
  | "right";

export type ScrollLayoutConfig = {
  mode: ScrollLayoutMode;
  overlaySide: "left" | "right" | "center";
  overlayAlign: "top" | "bottom" | "center";
  overlayBackground: "dark" | "light";
  overlayWidthClass: string;
  overlayContainerClass: string;
  overlayPanelClass: string;
  overlayPaddingClass: string;
  imagePadding?: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
  floatingPosition: ScrollFloatingPosition;
};

function mapMode<T>(
  items: Record<ScrollLayoutMode, T>,
  mode: ScrollLayoutMode,
): T {
  return items[mode];
}

export function getScrollLayoutConfig(
  behaviors: string[] = [],
): ScrollLayoutConfig {
  const isOverlayLight = behaviors.includes("backdrop-light");
  const isOverlayDark = behaviors.includes("backdrop-dark");
  const hasExplicitFloating = behaviors.includes("floating");
  const hasFloatPosition = behaviors.some((behavior) =>
    behavior.startsWith("float-"),
  );
  const hasSplitHint =
    behaviors.includes("left") || behaviors.includes("right");

  const mode: ScrollLayoutMode =
    hasExplicitFloating || hasFloatPosition
      ? "floating"
      : hasSplitHint
        ? "split"
        : "none";

  const { floatingPosition } = getFloatingFromBehaviours({
    behavior: behaviors,
    defaultIsFloating: false,
    defaultFloatingPosition: "bottom-left",
  });

  const overlaySide =
    mode === "split"
      ? behaviors.includes("right") ? "right" : "left"
      : floatingPosition === "top" || floatingPosition === "bottom"
        ? "center"
        : floatingPosition.includes("right") ? "right" : "left";
  const overlayAlign =
    floatingPosition === "left" || floatingPosition === "right"
      ? "center"
      : floatingPosition.includes("top")
        ? "top"
        : "bottom";
  const overlayBackground = isOverlayLight
    ? "light"
    : isOverlayDark
      ? "dark"
      : "dark";

  const overlayWidthClass = mapMode(
    {
      none: "w-full lg:w-[35vw]",
      split: "w-full lg:w-[35vw]",
      floating: "w-full lg:w-[35vw]",
    },
    mode,
  );

  const overlayContainerClass = mapMode(
    {
      none: "relative z-20 lg:col-start-1 lg:row-start-1 lg:flex",
      split: "relative z-20 lg:flex lg:shrink-0",
      floating: "relative z-20 lg:col-start-1 lg:row-start-1 lg:flex",
    },
    mode,
  );

  const overlayPanelClass =
    overlayBackground === "light"
      ? "bg-white/90 text-black shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
      : "bg-black/85 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]";
  const overlayPaddingClass = mapMode(
    {
      none: "px-8 py-10 lg:px-12",
      split: "px-8 py-10 lg:px-12",
      floating: "px-8 py-10 lg:px-12",
    },
    mode,
  );

  return {
    mode,
    overlaySide,
    overlayAlign,
    overlayBackground,
    overlayWidthClass,
    overlayContainerClass,
    overlayPanelClass,
    overlayPaddingClass,
    floatingPosition,
  };
}

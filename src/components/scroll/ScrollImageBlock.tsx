import { CanvasPreviewBlock, type CanvasPreviewBlockProps } from "@/components/CanvasPreviewBlock";
import { BaseGridSection } from "@/components/shared/BaseGridSection";
import { getScrollLayoutConfig } from "@/helpers/scroll-layout";
import { useScrollTheme } from "@/theme/scroll-theme";
import type { Canvas } from "@iiif/presentation-3";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { LocaleString, useVaultSelector } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { useIntersectionObserver } from "usehooks-ts";

export interface ScrollImageBlockProps {
  canvas: CanvasNormalized;
  id?: string;
  index: number;
  scrollEnabled?: boolean;
  objectLinks?: CanvasPreviewBlockProps["objectLinks"];
  className?: string;
}

export function ScrollImageBlock({ canvas, id, index, scrollEnabled, objectLinks = [], className }: ScrollImageBlockProps) {
  const [ref, entry] = useIntersectionObserver({
    freezeOnceVisible: false,
    threshold: 0,
    root: null,
    rootMargin: "0px",
  });
  const behavior = useVaultSelector((_, vault) => vault.get<Canvas>(canvas.id)?.behavior || canvas.behavior || [], [
    canvas.id,
    canvas.behavior,
  ]);
  const layout = getScrollLayoutConfig(behavior);
  const {
    tourBlock: { ignoreCanvasBackgrounds },
  } = useScrollTheme();
  const overlaySideClass =
    layout.overlaySide === "center" ? "justify-center" : layout.overlaySide === "left" ? "justify-start" : "justify-end";
  const overlayAlignClass =
    layout.overlayAlign === "center" ? "items-center" : layout.overlayAlign === "top" ? "items-start" : "items-end";
  const splitOrderClass = layout.overlaySide === "left" ? "lg:flex-row-reverse" : "lg:flex-row";
  const hasLabel = Boolean(canvas.label);

  return (
    <BaseGridSection
      enabled={scrollEnabled}
      id={id || `${index}`}
      className={twMerge(
        "relative w-full bg-black",
        "min-h-screen",
        "overflow-hidden",
        layout.mode === "split" && "lg:flex",
        layout.mode === "split" && splitOrderClass,
        className,
      )}
    >
      <div ref={ref} className="relative h-full min-h-screen w-full min-w-0 flex-1">
        <div className="absolute inset-0">
          {entry ? (
            <CanvasPreviewBlock
              canvasId={canvas.id}
              cover
              index={index}
              objectLinks={objectLinks}
              // padding={layout.imagePadding}
              alternativeMode
              ignoreCanvasBackgrounds={ignoreCanvasBackgrounds}
            />)
          : null}
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-black/0 to-black/55" />
      </div>

      {(layout.mode !== "none" && canvas.label) || canvas.summary ? (
        <div
          className={twMerge(
            layout.overlayWidthClass,
            layout.overlayContainerClass,
            layout.mode === "split" ? "h-full" : "pointer-events-none",
          )}
        >
          <div
            className={twMerge(
              "flex h-full w-full",
              layout.mode === "split" ? "items-center" : `${overlaySideClass} ${overlayAlignClass}`,
            )}
          >
            <div
              className={twMerge(
                "pointer-events-auto w-full",
                layout.mode === "floating" && layout.overlayWidthClass,
                layout.overlayPaddingClass,
                layout.overlayPanelClass,
                layout.mode === "floating" && "m-8 lg:m-12 rounded-2xl",
                layout.mode === "split" && "h-full",
              )}
            >
              <div className="flex h-full flex-col justify-center gap-4">
                {canvas.label ? (
                  <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">
                    <LocaleString>{canvas.label}</LocaleString>
                  </h2>
                ) : null}
                {canvas.summary ? (
                  <LocaleString
                    as="div"
                    enableDangerouslySetInnerHTML
                    className={twMerge("text-base leading-relaxed", hasLabel ? "text-current/85" : "text-current")}
                  >
                    {canvas.summary}
                  </LocaleString>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </BaseGridSection>
  );
}

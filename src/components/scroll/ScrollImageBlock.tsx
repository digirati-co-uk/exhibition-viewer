import { CanvasPreviewBlock, type CanvasPreviewBlockProps } from "@/components/CanvasPreviewBlock";
import { BaseGridSection } from "@/components/shared/BaseGridSection";
import { getScrollLayoutConfig } from "@/helpers/scroll-layout";
import { useLazyMount } from "@/helpers/use-lazy-mount";
import { useScrollTheme } from "@/theme/scroll-theme";
import type { Canvas } from "@iiif/presentation-3";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { LocaleString, useVaultSelector } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";

export interface ScrollImageBlockProps {
  canvas: CanvasNormalized;
  id?: string;
  index: number;
  scrollEnabled?: boolean;
  objectLinks?: CanvasPreviewBlockProps["objectLinks"];
  className?: string;
  /** Replaces the image viewer (used by audio slides, which reuse this section + label/summary overlay layout). */
  renderContent?: () => React.ReactNode;
  /** Behaviors used for the label/summary overlay layout instead of the canvas'. */
  layoutBehavior?: string[];
}

export function ScrollImageBlock({
  canvas,
  id,
  index,
  scrollEnabled,
  objectLinks = [],
  className,
  renderContent,
  layoutBehavior,
}: ScrollImageBlockProps) {
  const {
    tourBlock: { ignoreCanvasBackgrounds },
  } = useScrollTheme();
  // Audio uses this layout too and still mounts only once it is visible.
  const [ref, shouldMount] = useLazyMount({ margin: renderContent ? "0px" : undefined });
  const behavior = useVaultSelector(
    (_, vault) => vault.get<Canvas>(canvas.id)?.behavior || canvas.behavior || [],
    [canvas.id, canvas.behavior]
  );
  const layout = getScrollLayoutConfig(layoutBehavior || behavior);
  const isSplit = layout.mode === "split";
  const overlaySideClass =
    layout.overlaySide === "center"
      ? "lg:justify-center"
      : layout.overlaySide === "left"
        ? "lg:justify-start"
        : "lg:justify-end";
  const overlayAlignClass =
    layout.overlayAlign === "center" ? "lg:items-center" : layout.overlayAlign === "top" ? "lg:items-start" : "lg:items-end";
  const splitOrderClass = layout.overlaySide === "left" ? "lg:flex-row-reverse" : "lg:flex-row";
  const hasLabel = Boolean(canvas.label);
  const hasEditorial = Boolean((layout.mode !== "none" && canvas.label) || canvas.summary);

  // Below `lg` the section is a column: the image takes whatever height the text leaves, and the text follows it
  // in normal flow. From `lg`, split is a row and floating/none stack the text over the image in one grid cell, so
  // long text grows the section instead of scrolling inside a panel.
  return (
    <BaseGridSection
      enabled={scrollEnabled}
      id={id || `${index}`}
      className={twMerge(
        "relative flex w-full flex-col overflow-hidden bg-black",
        "min-h-[var(--exv-scroll-image-min-height,100vh)]",
        isSplit ? splitOrderClass : "lg:grid",
        isSplit && "lg:flex",
        className
      )}
    >
      <div
        ref={ref}
        className={twMerge(
          "relative w-full min-w-0 flex-1",
          "min-h-[var(--exv-scroll-image-min-height,100vh)]",
          hasEditorial && "min-h-[calc(58*var(--exv-vh,1vh))] lg:min-h-[var(--exv-scroll-image-min-height,100vh)]",
          !isSplit && "lg:col-start-1 lg:row-start-1"
        )}
      >
        <div className="absolute inset-0">
          {shouldMount ? (
            renderContent ? (
              renderContent()
            ) : (
              <CanvasPreviewBlock
                canvasId={canvas.id}
                cover
                index={index}
                objectLinks={objectLinks}
                // padding={layout.imagePadding}
                ignoreCanvasBackgrounds={ignoreCanvasBackgrounds}
              />
            )
          ) : null}
        </div>
        {renderContent ? null : (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-black/0 to-black/55" />
        )}
      </div>

      {hasEditorial ? (
        <div
          className={twMerge(
            layout.overlayContainerClass,
            isSplit ? layout.overlayWidthClass : `lg:pointer-events-none ${overlaySideClass} ${overlayAlignClass}`
          )}
        >
          <div
            className={twMerge(
              "pointer-events-auto w-full",
              !isSplit && layout.overlayWidthClass,
              layout.overlayPaddingClass,
              layout.overlayPanelClass,
              isSplit && "lg:flex lg:flex-col lg:justify-center",
              layout.mode === "floating" && "lg:m-8 lg:rounded-2xl"
            )}
          >
            <div className="flex flex-col gap-4 break-words">
              {canvas.label ? (
                <h2 className="text-2xl font-semibold leading-tight sm:text-3xl">
                  <LocaleString>{canvas.label}</LocaleString>
                </h2>
              ) : null}
              {canvas.summary ? (
                <LocaleString
                  as="div"
                  enableDangerouslySetInnerHTML
                  className={twMerge("text-base leading-relaxed", hasLabel ? "opacity-[0.85]" : "")}
                >
                  {canvas.summary}
                </LocaleString>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </BaseGridSection>
  );
}

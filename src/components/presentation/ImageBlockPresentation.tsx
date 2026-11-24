import type { ImageBlockProps } from "@/components/exhibition/ImageBlock";
import { CanvasPresentationBlock } from "@/components/presentation/CanvasPresentationBlock";
import { BaseSlide, type BaseSlideProps } from "@/components/shared/BaseSlide";
import { NonLinearTourCanvas } from "@/components/shared/NonLinearTourCanvas";
import type { Annotation, Canvas } from "@iiif/presentation-3";
import { type CSSProperties, Suspense } from "react";
import { CanvasContext, LocaleString, useVaultSelector } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { getFloatingFromBehaviours } from "../../helpers/exhibition";
import { useExhibitionStep } from "../../helpers/exhibition-store";
import { useStepDetails } from "../../helpers/use-step-details";
import type { FloatingPosition } from "../../theme/exhibition-theme";

interface ImageBlockPresentationProps extends ImageBlockProps, BaseSlideProps {
  isFloating?: boolean;
  floatingPosition?: FloatingPosition;
  labelOnlyFloating?: boolean;
}

const floatingPositionClass: Record<FloatingPosition, string> = {
  "top-left": "left-2 top-2",
  "top-right": "right-2 top-2",
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-2 right-2",
  top: "left-1/2 top-2 -translate-x-1/2",
  bottom: "bottom-2 left-1/2 -translate-x-1/2",
  left: "left-2 top-1/2 -translate-y-1/2",
  right: "right-2 top-1/2 -translate-y-1/2",
};

function getTextRegionStyle(behavior: string[], width: number, height: number): CSSProperties | undefined {
  const region = behavior.find((flag) => flag.startsWith("text-xywh="));
  if (!region || !(width > 0 && height > 0)) return undefined;
  const values = region.slice("text-xywh=".length).split(",").map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) return undefined;
  const [x, y, w, h] = values;
  if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > width || y + h > height) return undefined;

  return {
    "--exv-text-x": `${x / width * 100}%`,
    "--exv-text-y": `${y / height * 100}%`,
    "--exv-text-width": `${w / width * 100}%`,
    "--exv-text-height": `${h / height * 100}%`,
  } as CSSProperties;
}

export function ImageBlockPresentation({
  canvas,
  objectLinks,
  ignoreCanvasBackgrounds,
  isFloating: defaultIsFloating = false,
  floatingPosition: defaultFloatingPosition = "top-left",
  labelOnlyFloating: defaultLabelOnlyFloating = true,
  ...props
}: ImageBlockPresentationProps) {
  const step = useExhibitionStep();
  const active = step?.canvasId === canvas.id;
  const canvasBehavior = useVaultSelector(
    (_, vault) => vault.get<Canvas>(canvas.id)?.behavior || canvas.behavior || [],
    [canvas.id, canvas.behavior]
  );
  const stepBehavior = useVaultSelector(
    (_, vault) => {
      if (!active) return [];
      const annotationId = step?.behaviorAnnotationId || step?.annotationId;
      return annotationId
        ? vault.get<Annotation>(annotationId)?.behavior || step?.behavior || []
        : step?.behavior || [];
    },
    [active, step?.annotationId, step?.behavior, step?.behaviorAnnotationId]
  );
  const behavior = [...canvasBehavior, ...stepBehavior];
  const { isLeft, isBottom, isTop, isActive, showSummary, label, summary, showBody, toShow } = useStepDetails(
    canvas,
    step
  );

  const { isFloating, floatingPosition } = getFloatingFromBehaviours({
    behavior,
    defaultIsFloating,
    defaultFloatingPosition,
  });
  const labelOnlyFloating =
    behavior.includes("label-only-floating") || (defaultLabelOnlyFloating && !behavior.includes("label-only-sidebar"));
  const isLabelOnly = Boolean(label && !summary && (!toShow || toShow.length === 0));
  const showLabelOnlyFloating = isActive && labelOnlyFloating && isLabelOnly;
  const hasEditorialOverlay = Boolean(summary && getFloatingFromBehaviours({ behavior: canvasBehavior }).isFloating);
  const showSidePanel = (showSummary || hasEditorialOverlay) && !showLabelOnlyFloating;
  const isNonLinearTour = behavior.includes("non-linear-tour");
  const textRegionStyle = !isFloating && !step?.region
    ? getTextRegionStyle(canvasBehavior, canvas.width, canvas.height)
    : undefined;

  const canvasViewer = (
    <Suspense fallback={<div className="h-full w-full" />}>
      <CanvasContext canvas={canvas.id}>
        {isNonLinearTour ? (
          <NonLinearTourCanvas canvas={canvas} objectLinks={objectLinks} metadataPopup={props.metadataPopup} />
        ) : (
          <CanvasPresentationBlock
            fullWidth={!showSidePanel || isFloating || !!textRegionStyle}
            canvasId={canvas.id}
            cover={behavior.includes("cover") || behavior.includes("image-cover")}
            index={props.index}
            objectLinks={objectLinks}
            ignoreCanvasBackgrounds={ignoreCanvasBackgrounds}
            metadataPopup={props.metadataPopup}
            metadataPopupActive={active}
          />
        )}
      </CanvasContext>
    </Suspense>
  );

  return (
    <BaseSlide className={"mb-8 bg-InfoBlock"} index={props.index} active={active}>
      <div
        className={twMerge(
          "relative flex h-full min-h-0 flex-col md:flex-row",
          isLeft && "md:flex-row-reverse",
          isBottom && "md:flex-col",
          isTop && "flex-col-reverse md:flex-col-reverse"
        )}
      >
        <div
          className={twMerge(
            "cut-corners min-h-0 flex-1 md:w-2/3",
            (isBottom || isTop) && "w-full md:w-full",
            (!showSidePanel || isNonLinearTour) && "w-full md:w-full"
          )}
        >
          {canvasViewer}
        </div>
        {showLabelOnlyFloating && !isNonLinearTour ? (
          <div
            className={twMerge(
              "cut-corners absolute z-20 flex w-[calc(100%-1rem)] max-w-[28rem] flex-row items-center gap-4 bg-InfoBlock p-5 text-InfoBlockText shadow-lg md:w-1/3",
              floatingPositionClass[floatingPosition]
            )}
          >
            <div className="text-m min-w-0 flex-1 font-mono delft-title">
              <LocaleString>{label}</LocaleString>
            </div>
            <div className="flex-shrink-0">
              <svg
                aria-hidden="true"
                className="rotate-180"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor" />
              </svg>
            </div>
          </div>
        ) : null}
        <div
          className={twMerge(
            "cut-corners flex min-h-0 max-h-[60%] flex-col overflow-hidden bg-InfoBlock text-InfoBlockText p-5 md:max-h-full md:w-1/3",
            (isBottom || isTop) && "w-full md:max-h-[60%] md:w-full",
            isActive ? "opacity-100" : "opacity-0",
            (!showSidePanel || isNonLinearTour) && "hidden",
            isFloating && "absolute max-h-[calc(100%-1rem)] z-20",
            isFloating && floatingPositionClass[floatingPosition],
            textRegionStyle && "md:absolute md:z-20 md:left-[var(--exv-text-x)] md:top-[var(--exv-text-y)] md:w-[var(--exv-text-width)] md:h-[var(--exv-text-height)] md:max-h-none"
          )}
          style={textRegionStyle}
        >
          <div className={twMerge("mb-4 flex shrink-0 flex-row items-center gap-4", isLeft && "flex-row-reverse")}>
            <div className={twMerge("flex-shrink-0", isFloating && "hidden")}>
              <svg
                aria-hidden="true"
                className={twMerge(
                  "rotate-90 md:rotate-0",
                  isLeft && "md:rotate-180",
                  isBottom && "md:rotate-90",
                  isTop && "-rotate-90 md:-rotate-90"
                )}
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor" />
              </svg>
            </div>
            <div className="text-m min-w-0 flex-1 font-mono delft-title">
              <LocaleString>{label}</LocaleString>
            </div>
          </div>
          <div className={twMerge("exhibition-info-block min-h-0 overflow-y-auto", isActive ? "opacity-100" : "opacity-0")}>
            <div>
              <LocaleString enableDangerouslySetInnerHTML className="whitespace-pre-wrap">
                {summary}
              </LocaleString>
            </div>
            {showBody && toShow
              ? (toShow || []).map((body, n) => {
                  if (body.type === "TextualBody") {
                    return (
                      <div className="prose-sm exhibition-html" key={n}>
                        <LocaleString enableDangerouslySetInnerHTML>{body.value}</LocaleString>
                      </div>
                    );
                  }
                  return null;
                })
              : null}
            {canvas.requiredStatement && (
              <div className="">
                <LocaleString>{canvas.requiredStatement.value}</LocaleString>
              </div>
            )}
          </div>
        </div>
      </div>
    </BaseSlide>
  );
}

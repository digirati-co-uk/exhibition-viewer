import type { ImageBlockProps } from "@/components/exhibition/ImageBlock";
import { CanvasPresentationBlock } from "@/components/presentation/CanvasPresentationBlock";
import { BaseSlide, type BaseSlideProps } from "@/components/shared/BaseSlide";
import { NonLinearTourCanvas } from "@/components/shared/NonLinearTourCanvas";
import type { Annotation, Canvas } from "@iiif/presentation-3";
import { Suspense } from "react";
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
    [canvas.id, canvas.behavior],
  );
  const stepBehavior = useVaultSelector((_, vault) => {
    if (!active) return [];
    const annotationId = step?.behaviorAnnotationId || step?.annotationId;
    return annotationId ? vault.get<Annotation>(annotationId)?.behavior || step?.behavior || [] : step?.behavior || [];
  }, [active, step?.annotationId, step?.behavior, step?.behaviorAnnotationId]);
  const behavior = [...canvasBehavior, ...stepBehavior];
  const { isLeft, isBottom, isTop, isActive, showSummary, label, summary, showBody, toShow } = useStepDetails(
    canvas,
    step,
  );

  const { isFloating, floatingPosition } = getFloatingFromBehaviours({
    behavior,
    defaultIsFloating,
    defaultFloatingPosition,
  });
  const labelOnlyFloating =
    behavior.includes("label-only-floating") ||
    (defaultLabelOnlyFloating && !behavior.includes("label-only-sidebar"));
  const isLabelOnly = Boolean(label && !summary && (!toShow || toShow.length === 0));
  const showLabelOnlyFloating = isActive && labelOnlyFloating && isLabelOnly;
  const showSidePanel = showSummary && !showLabelOnlyFloating;
  const isNonLinearTour = behavior.includes("non-linear-tour");

  const canvasViewer = (
    <Suspense fallback={<div className="h-full w-full" />}>
      <CanvasContext canvas={canvas.id}>
        {isNonLinearTour ? (
          <NonLinearTourCanvas canvas={canvas} objectLinks={objectLinks} />
        ) : (
          <CanvasPresentationBlock
            fullWidth={!showSummary}
            canvasId={canvas.id}
            cover={false}
            index={props.index}
            objectLinks={objectLinks}
            ignoreCanvasBackgrounds={ignoreCanvasBackgrounds}
          />
        )}
      </CanvasContext>
    </Suspense>
  );

  return (
    <BaseSlide className={"mb-8 bg-InfoBlock"} index={props.index} active={active}>
      <div
        className={twMerge(
          "relative h-full md:flex",
          isLeft && "flex-row-reverse",
          isBottom && "flex-col",
          isTop && "flex-col-reverse",
        )}
      >
        <div
          className={twMerge(
            "cut-corners flex-1 md:w-2/3",
            (isBottom || isTop) && "w-full md:w-full",
            "aspect-square md:aspect-auto",
            (!showSidePanel || isNonLinearTour) && "w-full md:w-full",
          )}
        >
          {canvasViewer}
        </div>
        {showLabelOnlyFloating && !isNonLinearTour ? (
          <div
            className={twMerge(
              "cut-corners absolute z-20 flex w-[calc(100%-1rem)] max-w-[28rem] flex-row items-center gap-4 bg-InfoBlock p-5 text-InfoBlockText shadow-lg md:w-1/3",
              floatingPositionClass[floatingPosition],
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
            "cut-corners flex flex-col bg-InfoBlock text-InfoBlockText p-5 md:w-1/3",
            (isBottom || isTop) && "w-full md:w-full",
            isActive ? "opacity-100" : "opacity-0",
            (!showSidePanel || isNonLinearTour) && "hidden",
            isFloating && "absolute max-h-[calc(100%-1rem)] z-20",
            isFloating && floatingPositionClass[floatingPosition],
          )}
        >
          <div className={twMerge("mb-4 flex flex-row items-center gap-4", isLeft && "flex-row-reverse")}>
            <div className={twMerge("flex-shrink-0", isFloating && "hidden")}>
              <svg
                aria-hidden="true"
                className={twMerge(isLeft && "rotate-180", isBottom && "rotate-90")}
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
          <div className={twMerge("exhibition-info-block overflow-y-auto", isActive ? "opacity-100" : "opacity-0")}>
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

import { createExhibitionStore } from "@/helpers/exhibition-store";
import type { ExhibitionStep } from "@/helpers/exhibition-store";
import { formatScrollContent, useScrollContent } from "@/helpers/scroll-content";
import { getTourCameraPadding, useCaptionInsets } from "@/helpers/use-caption-insets";
import { useStepDetails } from "@/helpers/use-step-details";
import { useCanvasHighlights } from "@/helpers/use-canvas-highlights";
import { useLazyMount } from "@/helpers/use-lazy-mount";
import { useScrollTheme } from "@/theme/scroll-theme";
import type { Runtime } from "@atlas-viewer/atlas";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocaleString, useAtlasStore, useCanvas, useVault, useViewportTour } from "react-iiif-vault";
import { useStore } from "zustand";
import { CanvasPreviewBlock, type CanvasPreviewBlockProps } from "../CanvasPreviewBlock";
import { NextIcon } from "../icons/NextIcon";
import { PreviousIcon } from "../icons/PreviousIcon";
import { NonLinearTourCanvas } from "../shared/NonLinearTourCanvas";
import { ScrollPanelSection } from "./ScrollPanelSection";
import { ScrollTourAnnotation } from "./ScrollTourAnnotation";

export interface ScrollTourBlockProps {
  canvas: CanvasNormalized;
  id?: string;
  index: number;
  scrollEnabled?: boolean;
  objectLinks?: CanvasPreviewBlockProps["objectLinks"];
  cutCorners?: boolean;
}

function sameSpatial(a: any, b: any) {
  return a && b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function ScrollTourBlock(props: ScrollTourBlockProps) {
  if (props.canvas.behavior?.includes("non-linear-tour")) {
    return <NonLinearScrollTourBlock {...props} />;
  }

  if (props.canvas.behavior?.includes("manual-tour")) {
    return <ManualScrollTourBlock {...props} />;
  }

  return <ScrollDrivenTourBlock {...props} />;
}

function ScrollDrivenTourBlock(props: ScrollTourBlockProps) {
  const vault = useVault();
  const canvas = useCanvas();
  const {
    tourBlock: { viewerBackground, useBlurBackground = false, viewerMargin = false, ignoreCanvasBackgrounds },
  } = useScrollTheme();
  const [ref, shouldMount] = useLazyMount();
  const store = useMemo(
    () =>
      createExhibitionStore({
        vault: vault as any,
        canvases: [canvas as any],
        objectLinks: props.objectLinks,
        firstStep: !!canvas?.summary,
      }),
    [vault, canvas, props.objectLinks],
  );
  const { steps } = useStore(store);

  const cover = props.canvas.behavior?.includes("image-cover") || props.canvas.behavior?.includes("cover");
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const initial = useMemo(() => {
    const canvasInitial = { x: 0, y: 0, width: canvas?.width || 0, height: canvas?.height || 0 };
    return cover && runtime ? runtime.getHomeTarget({ cover }) : canvasInitial;
  }, [canvas, cover, runtime]);

  useEffect(() => {
    if (!shouldMount) setRuntime(null);
  }, [shouldMount]);

  const container = useRef<HTMLDivElement>(null);
  const captions = useRef<HTMLDivElement>(null);
  const placeholder = useRef<HTMLDivElement>(null);
  const captionInsets = useCaptionInsets({
    enabled: viewerMargin && shouldMount,
    viewportRef: container,
    captionsRef: captions,
    hasRegion: (index) => Boolean(steps[index]?.region?.selector?.spatial),
    deps: [steps],
  });

  const regions = useMemo(() => {
    return steps.map((step) => (step.region?.selector?.spatial || initial) as any);
  }, [initial, steps]);

  const tour = useViewportTour({
    initial,
    regions,
    getProgress: () => {
      const rect = container.current?.getBoundingClientRect();
      if (!rect) {
        return 0;
      }
      // Each step is one screen tall; measuring it keeps progress right when the viewport unit isn't `innerHeight`.
      const stepHeight = placeholder.current?.firstElementChild?.getBoundingClientRect().height || window.innerHeight;
      return -rect.top / stepHeight;
    },
    // getProgress: typeof progressSource === "function" ? (progressSource as () => number) : undefined,
    // progress: typeof progressSource === "number" ? (progressSource as number) : undefined,
    // enabled,
    // easing: "ease-in-out",
    reportEveryFrame: true,
    pollInterval: 32,
    // loop,
    // onEnter,
    // onExit,
    // onProgress: (index, t) => {
    //   console.log("on progress", index, t);
    // },
    // jumpTo: jumpToProp,
  });

  const atlasStore = useAtlasStore();
  const highlights = useCanvasHighlights();
  const highlightOverlays = useMemo(() => {
    const progress = tour.currentIndex >= steps.length ? 1 : tour.t;
    const currentIndex = Math.min(tour.currentIndex, steps.length - 1);
    const findHighlight = (index: number) => {
      const annotationId = steps[index]?.annotationId;
      const spatial = steps[index]?.region?.selector?.spatial;
      return highlights.find(
        (highlight: any) =>
          (annotationId && highlight.annotationId === annotationId) || sameSpatial(highlight?.selector?.spatial, spatial),
      );
    };

    return [
      { highlight: tour.currentIndex > 0 ? findHighlight(tour.currentIndex - 1) : null, opacity: 1 - progress },
      { highlight: currentIndex >= 0 ? findHighlight(currentIndex) : null, opacity: progress },
    ].filter((item) => item.highlight && item.opacity > 0);
  }, [highlights, steps, tour.currentIndex, tour.t]);

  useEffect(() => {
    if (!runtime) return;
    if (!tour.rect) return;

    const spatial = steps[tour.currentIndex]?.region?.selector?.spatial;

    if (cover && !spatial) {
      runtime.goHome({ cover });
      return;
    }

    // Without clearance there are no insets, so this is the same framing with even screen-pixel margins.
    runtime.world.gotoRegion({
      ...tour.rect,
      paddingPx: getTourCameraPadding(captionInsets, tour.currentIndex, tour.t),
    });
  }, [runtime, tour.rect, tour.currentIndex, tour.t, steps, cover, captionInsets]);

  if (!canvas) return null;

  return (
    <div id={props.id} ref={container} className="bg-slate-500 text-black min-h-[var(--exv-screen,100vh)] relative">
      <div ref={ref} className="image z-10 h-[var(--exv-screen,100vh)] sticky top-0 pointer-events-none">
        {shouldMount ?
          <CanvasPreviewBlock
            interactive
            setRuntime={setRuntime}
            canvasId={canvas.id}
            index={props.index}
            objectLinks={props.objectLinks}
            highlightOverlays={highlightOverlays}
            // padding={layout.imagePadding}
            disablePopup
            cover={cover}
            viewerBackground={viewerBackground}
            useBlurBackground={useBlurBackground}
            ignoreCanvasBackgrounds={ignoreCanvasBackgrounds}
          /> : null}
      </div>
      <div ref={placeholder} className="placeholder">
        {steps.map((step, stepIndex) => {
          const stepId = `${props.id || props.index}-step-${stepIndex}`;
          return (
            <div
              id={stepId}
              key={step.annotationId || `${canvas.id}-${stepIndex}`}
              className="h-[var(--exv-screen,100vh)]"
              data-step-id={stepId}
            />
          );
        })}
      </div>
      <div ref={captions} className="steps absolute inset-x-0 bottom-0 z-20" data-annotation-list="true">
        {steps.map((step, stepIndex) => {
          return <ScrollTourAnnotation key={step.annotationId || `${canvas.id}-${stepIndex}`} step={step} cutCorners={props.cutCorners} />;
        })}
      </div>
    </div>
  );
}

function NonLinearScrollTourBlock(props: ScrollTourBlockProps) {
  const {
    tourBlock: { viewerBackground },
  } = useScrollTheme();
  const [ref, shouldMount] = useLazyMount();

  return (
    <section
      id={props.id || `${props.index}`}
      ref={ref}
      className="relative h-[var(--exv-screen,100vh)] overflow-hidden bg-ViewerBackground text-InfoBlockText"
    >
      {shouldMount ? (
        <NonLinearTourCanvas
          className="bg-ViewerBackground text-InfoBlockText"
          allowPageScroll
          canvas={props.canvas}
          objectLinks={props.objectLinks}
          viewerBackground={viewerBackground}
        />
      ) : null}
    </section>
  );
}

function ManualScrollTourBlock(props: ScrollTourBlockProps) {
  const vault = useVault();
  const canvas = useCanvas();
  const content = useScrollContent();
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const {
    showNavigationControls,
    tourBlock: { viewerBackground, useBlurBackground = false, ignoreCanvasBackgrounds },
  } = useScrollTheme();
  const store = useMemo(
    () =>
      createExhibitionStore({
        vault: vault as any,
        canvases: [props.canvas as any],
        objectLinks: props.objectLinks || [],
        firstStep: false,
      }),
    [vault, props.canvas, props.objectLinks],
  );
  const { currentStep, goToStep, nextStep, previousStep, steps } = useStore(store);
  const selectedStep = steps[currentStep] || steps[0] || null;
  const hasCanvasLabel = Boolean(canvas?.label);
  const cover = props.canvas.behavior?.includes("image-cover") || props.canvas.behavior?.includes("cover");

  useEffect(() => {
    if (!runtime || !selectedStep) return;

    const spatial = selectedStep.region?.selector?.spatial;
    if (spatial) {
      runtime.world.gotoRegion({ ...(spatial as any), padding: 80 });
      return;
    }

    runtime.goHome({ cover });
  }, [runtime, selectedStep, cover]);

  const dropRuntime = useCallback(() => setRuntime(null), []);

  if (!canvas) return null;

  return (
    <ScrollPanelSection
      id={props.id || `${props.index}`}
      panelWidth="24rem"
      onViewerUnmount={dropRuntime}
      // Leave room for the fixed previous/next controls.
      panelClassName={showNavigationControls ? "pr-16 lg:pr-16" : undefined}
      renderViewer={() => (
        <CanvasPreviewBlock
          interactive
          setRuntime={setRuntime}
          canvasId={props.canvas.id}
          index={props.index}
          objectLinks={props.objectLinks || []}
          disablePopup
          cover={cover}
          viewerBackground={viewerBackground}
          useBlurBackground={useBlurBackground}
          ignoreCanvasBackgrounds={ignoreCanvasBackgrounds}
        />
      )}
    >
      <div className="mb-6">
        <div className="font-mono text-xs uppercase tracking-[0.16em] opacity-60">{content.manualTour}</div>
        <LocaleString as="h2" className="mt-2 text-2xl font-semibold leading-tight">
          {canvas.label}
        </LocaleString>
        {canvas.summary ? (
          <LocaleString
            className={["mt-3 block text-sm leading-relaxed", hasCanvasLabel ? "opacity-75" : ""].join(" ")}
            enableDangerouslySetInnerHTML
          >
            {canvas.summary}
          </LocaleString>
        ) : null}
      </div>

      <div className="flex-1">
        {selectedStep ? <ManualTourStep step={selectedStep} /> : null}
        {!steps.length ? (
          <div className="border border-dashed border-ControlBarBorder p-5 text-sm opacity-70">
            {content.addAnnotationsManualTour}
          </div>
        ) : null}
      </div>

      {steps.length ? (
        <div className="sticky bottom-0 mt-6 flex items-center gap-3 border-t border-ControlBarBorder bg-InfoBlock py-4">
          <button
            type="button"
            aria-label={content.previousTourStop}
            disabled={currentStep <= 0}
            className="flex h-10 w-10 items-center justify-center border border-ControlBarBorder transition hover:bg-ControlHover disabled:cursor-not-allowed disabled:opacity-35"
            onClick={() => previousStep()}
          >
            <PreviousIcon aria-hidden="true" />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            {steps.map((step, stepIndex) => (
              <button
                key={step.annotationId || `${props.canvas.id}-${stepIndex}`}
                type="button"
                aria-label={formatScrollContent(content.goToTourStop, stepIndex + 1)}
                aria-current={stepIndex === currentStep ? "step" : undefined}
                className={[
                  "h-2.5 w-2.5 border border-current transition",
                  stepIndex === currentStep ? "bg-current" : "bg-transparent opacity-60 hover:opacity-100",
                ].join(" ")}
                onClick={() => goToStep(stepIndex)}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label={content.nextTourStop}
            disabled={currentStep >= steps.length - 1}
            className="flex h-10 w-10 items-center justify-center border border-ControlBarBorder transition hover:bg-ControlHover disabled:cursor-not-allowed disabled:opacity-35"
            onClick={() => nextStep()}
          >
            <NextIcon aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </ScrollPanelSection>
  );
}

function ManualTourStep({ step }: { step: ExhibitionStep }) {
  const canvas = useCanvas()!;
  const content = useScrollContent();
  const { label, summary, showBody, toShow } = useStepDetails(canvas, step);
  const hasLabel = Boolean(label);

  return (
    <article className="flex flex-col gap-4">
      <div className="font-mono text-xs uppercase tracking-[0.16em] opacity-50">{content.tourStop}</div>
      <LocaleString as="h3" className="text-xl font-semibold leading-tight">
        {label}
      </LocaleString>
      {summary ? (
        <LocaleString
          as="div"
          className={["text-sm leading-relaxed", hasLabel ? "opacity-75" : ""].join(" ")}
          enableDangerouslySetInnerHTML
        >
          {summary}
        </LocaleString>
      ) : null}
      {showBody && toShow
        ? (toShow || []).map((body, n) => {
            if (body.type === "TextualBody") {
              return (
                <div className="prose-sm exhibition-html opacity-90" key={n}>
                  <LocaleString enableDangerouslySetInnerHTML>{body.value}</LocaleString>
                </div>
              );
            }
            return null;
          })
        : null}
      {step.objectLink ? (step.objectLink as any).component : null}
    </article>
  );
}

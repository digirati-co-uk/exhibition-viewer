import { createExhibitionStore } from "@/helpers/exhibition-store";
import type { ExhibitionStep } from "@/helpers/exhibition-store";
import { useStepDetails } from "@/helpers/use-step-details";
import { useCanvasHighlights } from "@/helpers/use-canvas-highlights";
import { useScrollTheme } from "@/theme/scroll-theme";
import type { Runtime } from "@atlas-viewer/atlas";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LocaleString, useAtlasStore, useCanvas, useVault, useViewportTour } from "react-iiif-vault";
import { useStore } from "zustand";
import { CanvasPreviewBlock, type CanvasPreviewBlockProps } from "../CanvasPreviewBlock";
import { NextIcon } from "../icons/NextIcon";
import { PreviousIcon } from "../icons/PreviousIcon";
import { ScrollTourAnnotation } from "./ScrollTourAnnotation";
import { useIntersectionObserver } from "usehooks-ts";

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
  if (props.canvas.behavior?.includes("manual-tour")) {
    return <ManualScrollTourBlock {...props} />;
  }

  const [ref, entry] = useIntersectionObserver({
    freezeOnceVisible: false,
    threshold: 0,
    root: null,
    rootMargin: "0px",
  });
  const vault = useVault();
  const canvas = useCanvas();
  const {
    tourBlock: { viewerBackground, useBlurBackground = false, viewerMargin = false, ignoreCanvasBackgrounds },
  } = useScrollTheme();
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
  const paintingPage = canvas?.items[0] ? vault.get(canvas.items[0]) : null;
  const hasMultipleAnnotations = (paintingPage?.items.length || 0) > 1;
  const { currentStep, goToStep, nextStep, pause, play, previousStep, steps } = useStore(store);

  const cover = props.canvas.behavior?.includes("image-cover") || props.canvas.behavior?.includes("cover");
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const initial = useMemo(() => {
    const canvasInitial = { x: 0, y: 0, width: canvas?.width || 0, height: canvas?.height || 0 };
    return cover && runtime ? runtime.getHomeTarget({ cover }) : canvasInitial;
  }, [canvas, cover, runtime]);

  const container = useRef<HTMLDivElement>(null);
  const [initialPagePosition, setInitialPagePosition] = useState(0);
  const [annotationWindowWidth, setAnnotationWindowWidth] = useState(0);

  useLayoutEffect(() => {
    const $container = container.current;

    if ($container) {
      setInitialPagePosition($container.offsetTop || 0);

      const $list = $container.querySelector("[data-annotation-list]");
      if ($list) {
        const { width } = $list.getBoundingClientRect();
        setAnnotationWindowWidth(width);
      }
    }
  }, []);

  const regions = useMemo(() => {
    return steps.map((step) => (step.region?.selector?.spatial || initial) as any);
  }, [initial, steps]);

  const tour = useViewportTour({
    initial,
    regions,
    getProgress: () => {
      const height = container?.current?.getBoundingClientRect();
      if (!height) {
        return 0;
      }
      return (window.scrollY - initialPagePosition) / window.innerHeight;
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

    const padding = 50;
    const spatial = steps[tour.currentIndex]?.region?.selector?.spatial;

    if (cover && !spatial) {
      runtime.goHome({ cover });
      return;
    }

    runtime.world.gotoRegion({
      ...tour.rect,
      padding,
      paddingPx:
        tour.currentIndex === 0 || viewerMargin === false
          ? undefined
          : { left: annotationWindowWidth, top: padding, bottom: padding, right: padding },
    });
  }, [runtime, tour.rect, tour.currentIndex, steps, cover]);

  if (!canvas) return null;

  return (
    <div id={props.id} ref={container} className="bg-slate-500 text-black min-h-screen relative">
      <div ref={ref} className="image z-10 h-screen sticky top-0 pointer-events-none">
        {entry ?
          <CanvasPreviewBlock
            interactive
            setRuntime={setRuntime}
            canvasId={canvas.id}
            index={props.index}
            objectLinks={props.objectLinks}
            highlightOverlays={highlightOverlays}
            // padding={layout.imagePadding}
            alternativeMode
            disablePopup
            cover={cover}
            showCaption={false}
            viewerBackground={viewerBackground}
            useBlurBackground={useBlurBackground}
            ignoreCanvasBackgrounds={ignoreCanvasBackgrounds}
          /> : null}
        {canvas.requiredStatement || canvas.label ? (
          <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 max-w-[min(42rem,calc(100vw-2rem))] -translate-x-1/2 bg-black/75 px-5 py-3 text-center font-mono text-sm text-white shadow-lg">
            <LocaleString>{canvas.requiredStatement?.value || canvas.label}</LocaleString>
          </div>
        ) : null}
      </div>
      <div className="placeholder">
        {steps.map((step, stepIndex) => {
          return <div key={step.annotationId || `${canvas.id}-${stepIndex}`} className="h-screen" />;
        })}
      </div>
      <div className="steps absolute inset-x-0 bottom-0 z-20" data-annotation-list="true">
        {steps.map((step, stepIndex) => {
          return <ScrollTourAnnotation key={step.annotationId || `${canvas.id}-${stepIndex}`} step={step} cutCorners={props.cutCorners} />;
        })}
      </div>
    </div>
  );
}

function ManualScrollTourBlock(props: ScrollTourBlockProps) {
  const vault = useVault();
  const canvas = useCanvas();
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const {
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
  const hasCanvasLabel = Boolean(canvas.label);
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

  if (!canvas) return null;

  return (
    <section
      id={props.id || `${props.index}`}
      className="grid min-h-screen bg-black text-white lg:grid-cols-[minmax(0,1fr)_24rem]"
    >
      <div className="relative min-h-[56vh] lg:min-h-screen">
        <CanvasPreviewBlock
          interactive
          setRuntime={setRuntime}
          canvasId={props.canvas.id}
          index={props.index}
          objectLinks={props.objectLinks || []}
          alternativeMode
          disablePopup
          cover={cover}
          viewerBackground={viewerBackground}
          useBlurBackground={useBlurBackground}
          ignoreCanvasBackgrounds={ignoreCanvasBackgrounds}
        />
      </div>
      <div className="flex min-h-0 flex-col border-t border-white/10 bg-black p-6 lg:border-l lg:border-t-0 lg:p-8">
        <div className="mb-6">
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-white/50">Manual tour</div>
          <LocaleString as="h2" className="mt-2 text-2xl font-semibold leading-tight">
            {canvas.label}
          </LocaleString>
          {canvas.summary ? (
            <LocaleString
              className={["mt-3 block text-sm leading-relaxed", hasCanvasLabel ? "text-white/65" : "text-white"].join(" ")}
              enableDangerouslySetInnerHTML
            >
              {canvas.summary}
            </LocaleString>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {selectedStep ? <ManualTourStep step={selectedStep} /> : null}
          {!steps.length ? (
            <div className="border border-dashed border-white/20 p-5 text-sm text-white/60">
              Add annotations to this canvas to build a manual tour.
            </div>
          ) : null}
        </div>

        {steps.length ? (
          <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5">
            <button
              type="button"
              aria-label="Previous tour stop"
              disabled={currentStep <= 0}
              className="flex h-10 w-10 items-center justify-center border border-white/20 bg-white/5 text-white transition hover:border-white/45 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              onClick={() => previousStep()}
            >
              <PreviousIcon />
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
              {steps.map((step, stepIndex) => (
                <button
                  key={step.annotationId || `${props.canvas.id}-${stepIndex}`}
                  type="button"
                  aria-label={`Go to tour stop ${stepIndex + 1}`}
                  aria-current={stepIndex === currentStep ? "step" : undefined}
                  className={[
                    "h-2.5 w-2.5 border border-white/45 transition",
                    stepIndex === currentStep ? "bg-white" : "bg-transparent hover:bg-white/35",
                  ].join(" ")}
                  onClick={() => goToStep(stepIndex)}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Next tour stop"
              disabled={currentStep >= steps.length - 1}
              className="flex h-10 w-10 items-center justify-center border border-white/20 bg-white/5 text-white transition hover:border-white/45 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              onClick={() => nextStep()}
            >
              <NextIcon />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ManualTourStep({ step }: { step: ExhibitionStep }) {
  const canvas = useCanvas()!;
  const { label, summary, showBody, toShow } = useStepDetails(canvas, step);
  const hasLabel = Boolean(label);

  return (
    <article className="flex flex-col gap-4">
      <div className="font-mono text-xs uppercase tracking-[0.16em] text-white/45">Stop</div>
      <LocaleString as="h3" className="text-xl font-semibold leading-tight">
        {label}
      </LocaleString>
      {summary ? (
        <LocaleString
          as="div"
          className={["text-sm leading-relaxed", hasLabel ? "text-white/65" : "text-white"].join(" ")}
          enableDangerouslySetInnerHTML
        >
          {summary}
        </LocaleString>
      ) : null}
      {showBody && toShow
        ? (toShow || []).map((body, n) => {
            if (body.type === "TextualBody") {
              return (
                <div className="prose-sm exhibition-html text-white/80" key={n}>
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

import { createExhibitionStore } from "@/helpers/exhibition-store";
import type { ExhibitionStep } from "@/helpers/exhibition-store";
import { useStepDetails } from "@/helpers/use-step-details";
import { useScrollTheme } from "@/theme/scroll-theme";
import type { Runtime } from "@atlas-viewer/atlas";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LocaleString, useCanvas, useVault, useViewportTour } from "react-iiif-vault";
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
}

export function ScrollTourBlock(props: ScrollTourBlockProps) {
  if (props.canvas.behavior?.includes("non-linear-tour")) {
    return <NonLinearScrollTourBlock {...props} />;
  }

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
    tourBlock: { viewerBackground, useBlurBackground = false, viewerMargin = false },
  } = useScrollTheme();
  const store = useMemo(
    () =>
      createExhibitionStore({
        vault: vault as any,
        canvases: [canvas as any],
        objectLinks: [],
        firstStep: false,
      }),
    [vault, canvas],
  );
  const paintingPage = canvas?.items[0] ? vault.get(canvas.items[0]) : null;
  const hasMultipleAnnotations = (paintingPage?.items.length || 0) > 1;
  const { currentStep, goToStep, nextStep, pause, play, previousStep, steps } = useStore(store);

  const initial = useMemo(() => ({ x: 0, y: 0, width: canvas?.width || 0, height: canvas?.height || 0 }), [canvas]);

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
    return steps.map((step) => {
      return step.region?.selector?.spatial;
    });
  }, [steps]).filter(Boolean);

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

  const [runtime, setRuntime] = useState<Runtime | null>(null);

  useEffect(() => {
    if (!runtime) return;
    if (!tour.rect) return;

    const padding = 50;

    runtime.world.gotoRegion({
      ...tour.rect,
      padding,
      paddingPx:
        tour.currentIndex === 0 || viewerMargin === false
          ? undefined
          : { left: annotationWindowWidth, top: padding, bottom: padding, right: padding },
    });
  }, [runtime, tour.rect]);

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
            objectLinks={[]}
            // padding={layout.imagePadding}
            alternativeMode
            disablePopup
            cover={false}
            viewerBackground={viewerBackground}
            useBlurBackground={useBlurBackground}
          /> : null}
      </div>
      <div className="placeholder">
        {steps.map((step) => {
          return <div key={step.annotationId} className="h-screen" />;
        })}
      </div>
      <div className="steps absolute bottom-0 z-20" data-annotation-list="true">
        {steps.map((step) => {
          return <ScrollTourAnnotation key={step.annotationId} step={step} />;
        })}
      </div>
    </div>
  );
}

function NonLinearScrollTourBlock(props: ScrollTourBlockProps) {
  const vault = useVault();
  const canvas = useCanvas();
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const {
    tourBlock: { viewerBackground, useBlurBackground = false },
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
  const { currentStep, goToStep, steps } = useStore(store);
  const selectedStep = steps[currentStep] || null;

  useEffect(() => {
    goToStep(-1);
  }, [goToStep]);

  useEffect(() => {
    if (!runtime) return;

    const spatial = selectedStep?.region?.selector?.spatial;
    if (spatial) {
      runtime.world.gotoRegion({ ...(spatial as any), padding: 140 });
      return;
    }

    runtime.world.goHome();
  }, [runtime, selectedStep]);

  if (!canvas) return null;

  return (
    <section id={props.id || `${props.index}`} className="relative h-screen min-h-screen overflow-hidden bg-black text-white">
      <CanvasPreviewBlock
        setRuntime={setRuntime}
        canvasId={props.canvas.id}
        index={props.index}
        objectLinks={props.objectLinks || []}
        alternativeMode
        disablePopup
        cover={false}
        viewerBackground={viewerBackground || "#000"}
        useBlurBackground={useBlurBackground}
      />

      <NonLinearTourMarkers canvas={props.canvas} currentStep={currentStep} goToStep={goToStep} steps={steps} />

      {selectedStep ? (
        <NonLinearTourPanel
          step={selectedStep}
          onClose={() => goToStep(-1)}
        />
      ) : (
        <div className="pointer-events-none absolute left-5 top-5 z-20 max-w-sm rounded-sm bg-black/70 p-4 backdrop-blur-sm">
          <LocaleString as="h2" className="text-xl font-semibold leading-tight">
            {canvas.label}
          </LocaleString>
          {canvas.summary ? (
            <LocaleString className="mt-2 block text-sm leading-relaxed text-white/70" enableDangerouslySetInnerHTML>
              {canvas.summary}
            </LocaleString>
          ) : null}
        </div>
      )}

      {selectedStep ? (
        <button
          type="button"
          className="absolute right-5 top-5 z-30 bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/85"
          onClick={() => goToStep(-1)}
        >
          Exit
        </button>
      ) : null}
    </section>
  );
}

function NonLinearTourMarkers({
  canvas,
  currentStep,
  goToStep,
  steps,
}: {
  canvas: CanvasNormalized;
  currentStep: number;
  goToStep: (step: number) => void;
  steps: ExhibitionStep[];
}) {
  const container = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState({ height: 0, left: 0, top: 0, width: 0 });
  const explicitCanvasWidth = Number(canvas.width);
  const explicitCanvasHeight = Number(canvas.height);
  const canvasWidth =
    Number.isFinite(explicitCanvasWidth) && explicitCanvasWidth > 0
      ? explicitCanvasWidth
      : Math.max(
          ...steps.map((step) => {
            const target = getSpatialBox(step.region?.selector?.spatial);
            return target ? target.x + target.width : 0;
          }),
          1,
        );
  const canvasHeight =
    Number.isFinite(explicitCanvasHeight) && explicitCanvasHeight > 0
      ? explicitCanvasHeight
      : Math.max(
          ...steps.map((step) => {
            const target = getSpatialBox(step.region?.selector?.spatial);
            return target ? target.y + target.height : 0;
          }),
          1,
        );

  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;

    const updateRect = () => {
      const { height, width } = element.getBoundingClientRect();
      const scale = Math.min(width / canvasWidth, height / canvasHeight);
      const imageWidth = canvasWidth * scale;
      const imageHeight = canvasHeight * scale;
      setRect({
        height: imageHeight,
        left: (width - imageWidth) / 2,
        top: (height - imageHeight) / 2,
        width: imageWidth,
      });
    };

    const animationFrame = requestAnimationFrame(updateRect);
    const timeout = window.setTimeout(updateRect, 100);
    const observer = new ResizeObserver(updateRect);
    observer.observe(element);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, [canvasHeight, canvasWidth]);

  if (currentStep !== -1) return null;

  return (
    <div ref={container} className="pointer-events-none absolute inset-0 z-20">
      {steps.map((step, stepIndex) => {
        const target = getSpatialBox(step.region?.selector?.spatial);
        if (!target) return null;

        const left = rect.left + ((target.x + target.width / 2) / canvasWidth) * rect.width;
        const top = rect.top + ((target.y + target.height / 2) / canvasHeight) * rect.height;
        return (
          <button
            key={step.annotationId || `${canvas.id}-${stepIndex}`}
            type="button"
            aria-label={`Open tour stop ${stepIndex + 1}`}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              goToStep(stepIndex);
            }}
            className="pointer-events-auto absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black bg-white text-black shadow-[0_3px_14px_rgba(0,0,0,0.35)] transition hover:scale-110 hover:bg-zinc-100"
            style={{
              left,
              top,
            }}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-current" />
          </button>
        );
      })}
    </div>
  );
}

function getSpatialBox(spatial: any): { height: number; width: number; x: number; y: number } | null {
  if (!spatial) return null;

  const read = (...keys: string[]) => {
    for (const key of keys) {
      const value = typeof spatial.get === "function" ? spatial.get(key) : spatial[key];
      const numberValue = typeof value === "string" ? Number(value) : value;
      if (Number.isFinite(numberValue)) return numberValue;
    }
    return null;
  };

  const x = read("x");
  const y = read("y");
  const width = read("width", "w");
  const height = read("height", "h");

  if (x === null || y === null || width === null || height === null) return null;

  return { height, width, x, y };
}

function NonLinearTourPanel({ step, onClose }: { step: ExhibitionStep; onClose: () => void }) {
  const canvas = useCanvas()!;
  const { label, summary, showBody, toShow } = useStepDetails(canvas, step);

  return (
    <aside className="absolute bottom-0 left-0 top-0 z-30 flex w-full max-w-md flex-col overflow-y-auto bg-white p-6 text-black shadow-2xl md:m-5 md:bottom-auto md:max-h-[calc(100vh-2.5rem)]">
      <button
        type="button"
        aria-label="Close tour stop"
        className="absolute right-4 top-4 text-3xl leading-none text-black hover:text-black/65"
        onClick={onClose}
      >
        &times;
      </button>
      <LocaleString as="h2" className="pr-10 text-2xl font-semibold leading-tight">
        {label}
      </LocaleString>
      {summary ? (
        <LocaleString as="div" className="mt-6 text-lg leading-relaxed text-black/80" enableDangerouslySetInnerHTML>
          {summary}
        </LocaleString>
      ) : null}
      {showBody && toShow
        ? (toShow || []).map((body, index) => {
            if (body.type === "TextualBody") {
              return (
                <div className="exhibition-html mt-5 text-base leading-relaxed text-black/80" key={index}>
                  <LocaleString enableDangerouslySetInnerHTML>{body.value}</LocaleString>
                </div>
              );
            }
            return null;
          })
        : null}
      {step.objectLink ? (step.objectLink as any).component : null}
    </aside>
  );
}

function ManualScrollTourBlock(props: ScrollTourBlockProps) {
  const vault = useVault();
  const canvas = useCanvas();
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const {
    tourBlock: { viewerBackground, useBlurBackground = false },
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

  useEffect(() => {
    if (!runtime || !selectedStep) return;

    const spatial = selectedStep.region?.selector?.spatial;
    if (spatial) {
      runtime.world.gotoRegion({ ...(spatial as any), padding: 80 });
      return;
    }

    runtime.world.goHome();
  }, [runtime, selectedStep]);

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
          cover={false}
          viewerBackground={viewerBackground}
          useBlurBackground={useBlurBackground}
        />
      </div>
      <div className="flex min-h-0 flex-col border-t border-white/10 bg-black p-6 lg:border-l lg:border-t-0 lg:p-8">
        <div className="mb-6">
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-white/50">Manual tour</div>
          <LocaleString as="h2" className="mt-2 text-2xl font-semibold leading-tight">
            {canvas.label}
          </LocaleString>
          {canvas.summary ? (
            <LocaleString className="mt-3 block text-sm leading-relaxed text-white/65" enableDangerouslySetInnerHTML>
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

  return (
    <article className="flex flex-col gap-4">
      <div className="font-mono text-xs uppercase tracking-[0.16em] text-white/45">Stop</div>
      <LocaleString as="h3" className="text-xl font-semibold leading-tight">
        {label}
      </LocaleString>
      {summary ? (
        <LocaleString as="div" className="text-sm leading-relaxed text-white/65" enableDangerouslySetInnerHTML>
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

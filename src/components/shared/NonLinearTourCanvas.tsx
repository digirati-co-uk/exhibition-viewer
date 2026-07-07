import { createExhibitionStore } from "@/helpers/exhibition-store";
import type { ExhibitionStep } from "@/helpers/exhibition-store";
import type { ObjectLink } from "@/helpers/object-links";
import { useStepDetails } from "@/helpers/use-step-details";
import { HTMLPortal, type DefaultPresetOptions, type Runtime } from "@atlas-viewer/atlas";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CanvasPanel, LocaleString, useCanvas, useVault } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { useStore } from "zustand";

const NON_LINEAR_TOUR_ZOOM_PADDING = 80;
const EMPTY_OBJECT_LINKS: ObjectLink[] = [];

export function NonLinearTourCanvas({
  canvas,
  className,
  objectLinks = EMPTY_OBJECT_LINKS,
  viewerBackground,
}: {
  canvas: CanvasNormalized;
  className?: string;
  objectLinks?: Array<ObjectLink>;
  viewerBackground?: string;
}) {
  const vault = useVault();
  const contextCanvas = useCanvas();
  const activeCanvas = contextCanvas || canvas;
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [currentStep, setCurrentStep] = useState(-1);
  const background = viewerBackground || "#000";
  const viewerConfig = useMemo(
    () =>
      [
        "default-preset",
        {
          runtimeOptions: { visibilityRatio: 0.5 },
          interactive: true,
        } as DefaultPresetOptions,
      ] as any,
    [],
  );
  const store = useMemo(
    () =>
      createExhibitionStore({
        vault: vault as any,
        canvases: [activeCanvas as any],
        objectLinks,
        firstStep: false,
      }),
    [vault, activeCanvas, objectLinks],
  );
  const { steps } = useStore(store);
  const pinSteps = useMemo(() => {
    return steps.filter((step) => !isFullCanvasStep(step, activeCanvas));
  }, [activeCanvas, steps]);
  const selectedStep = pinSteps[currentStep] || null;

  useEffect(() => {
    setCurrentStep(-1);
  }, [activeCanvas.id]);

  const goToStep = useCallback(
    (step: number) => {
      if (step === -1 || (step >= 0 && step < pinSteps.length)) {
        setCurrentStep(step);
      }
    },
    [pinSteps.length],
  );

  useEffect(() => {
    if (!runtime) return;

    const spatial = selectedStep?.region?.selector?.spatial;
    if (spatial) {
      runtime.world.gotoRegion({ ...(spatial as any), padding: NON_LINEAR_TOUR_ZOOM_PADDING });
      return;
    }

    runtime.world.goHome();
  }, [runtime, selectedStep]);

  return (
    <div className={twMerge("relative h-full min-h-0 overflow-hidden bg-black text-white", className)}>
      <div
        className="exhibition-canvas-panel absolute inset-0 bg-ViewerBackground"
        style={{
          "--delft-viewer-background": background,
          "--atlas-background": background,
        } as any}
      >
        <CanvasPanel.Viewer
          containerStyle={{ height: "100%" }}
          renderPreset={viewerConfig}
          homeOnResize
          homeCover={false}
          background={background}
          onCreated={(preset) => {
            setRuntime(preset.runtime);
          }}
        >
          <CanvasPanel.RenderCanvas strategies={["images"]} enableSizes={false}>
            <NonLinearTourMarkers currentStep={currentStep} goToStep={goToStep} steps={pinSteps} />
          </CanvasPanel.RenderCanvas>
        </CanvasPanel.Viewer>
      </div>

      {selectedStep ? (
        <NonLinearTourPanel
          canvas={activeCanvas}
          step={selectedStep}
          onClose={() => goToStep(-1)}
        />
      ) : (
        <div className="pointer-events-none absolute left-5 top-5 z-20 max-w-sm rounded-sm bg-black/70 p-4 backdrop-blur-sm">
          <LocaleString as="h2" className="text-xl font-semibold leading-tight">
            {activeCanvas.label}
          </LocaleString>
          {activeCanvas.summary ? (
            <LocaleString className="mt-2 block text-sm leading-relaxed text-white/70" enableDangerouslySetInnerHTML>
              {activeCanvas.summary}
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
    </div>
  );
}

function NonLinearTourMarkers({
  currentStep,
  goToStep,
  steps,
}: {
  currentStep: number;
  goToStep: (step: number) => void;
  steps: ExhibitionStep[];
}) {
  return (
    <>
      {steps.map((step, stepIndex) => {
        const target = step.region?.selector?.spatial;
        if (!target) return null;

        const selected = stepIndex === currentStep;
        return (
          <HTMLPortal
            key={step.annotationId || `non-linear-tour-marker-${stepIndex}`}
            target={target as any}
            relative
            interactive={false}
            style={{
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <button
              type="button"
              aria-label={`${selected ? "Close" : "Open"} tour stop ${stepIndex + 1}`}
              aria-current={selected ? "step" : undefined}
              className={[
                "pointer-events-auto absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-[0_3px_14px_rgba(0,0,0,0.35)] transition hover:scale-110",
                selected
                  ? "border-black bg-white text-3xl leading-none text-black hover:bg-zinc-100"
                  : "border-white bg-black text-white hover:bg-zinc-900",
              ].join(" ")}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                goToStep(selected ? -1 : stepIndex);
              }}
            >
              {selected ? "\u00d7" : <span className="h-2.5 w-2.5 rounded-full bg-current" />}
            </button>
          </HTMLPortal>
        );
      })}
    </>
  );
}

function isFullCanvasStep(step: ExhibitionStep, canvas: CanvasNormalized) {
  const target = getSpatialBox(step.region?.selector?.spatial);
  if (!target) return false;

  return target.x === 0 && target.y === 0 && target.width === canvas.width && target.height === canvas.height;
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

function NonLinearTourPanel({
  canvas,
  onClose,
  step,
}: {
  canvas: CanvasNormalized;
  onClose: () => void;
  step: ExhibitionStep;
}) {
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

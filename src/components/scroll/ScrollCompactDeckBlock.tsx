import type { Runtime } from "@atlas-viewer/atlas";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { useEffect, useMemo, useState } from "react";
import { LocaleString, useCanvas, useVault } from "react-iiif-vault";
import { useStore } from "zustand";
import { CanvasPreviewBlock, type CanvasPreviewBlockProps } from "../CanvasPreviewBlock";
import { createExhibitionStore } from "../../helpers/exhibition-store";
import { useScrollTheme } from "../../theme/scroll-theme";

export interface ScrollCompactDeckBlockProps {
  canvas: CanvasNormalized;
  id?: string;
  index: number;
  objectLinks?: CanvasPreviewBlockProps["objectLinks"];
}

export function ScrollCompactDeckBlock({ canvas, id, index, objectLinks }: ScrollCompactDeckBlockProps) {
  const vault = useVault();
  const currentCanvas = useCanvas();
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const {
    tourBlock: { viewerBackground, useBlurBackground = false, ignoreCanvasBackgrounds },
  } = useScrollTheme();
  const store = useMemo(
    () =>
      createExhibitionStore({
        vault: vault as any,
        canvases: [canvas as any],
        objectLinks,
        firstStep: false,
      }),
    [vault, canvas, objectLinks],
  );
  const { currentStep, goToStep, steps } = useStore(store);
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

  if (!currentCanvas) return null;

  return (
    <section id={id || `${index}`} className="grid min-h-screen bg-zinc-950 text-white lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="relative min-h-[58vh] lg:min-h-screen">
        <CanvasPreviewBlock
          canvasId={canvas.id}
          index={index}
          objectLinks={objectLinks}
          alternativeMode
          disablePopup
          interactive
          cover={false}
          setRuntime={setRuntime}
          viewerBackground={viewerBackground || "#050505"}
          useBlurBackground={useBlurBackground}
          ignoreCanvasBackgrounds={ignoreCanvasBackgrounds}
        />
      </div>
      <div className="flex min-h-0 flex-col justify-center border-t border-white/10 bg-zinc-950/95 p-5 lg:border-l lg:border-t-0 lg:p-8">
        <div className="mb-6">
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-white/50">Image deck</div>
          <LocaleString as="h2" className="mt-2 text-2xl font-semibold leading-tight">
            {canvas.label}
          </LocaleString>
          {canvas.summary ? (
            <LocaleString className="mt-3 block text-sm leading-relaxed text-white/65" enableDangerouslySetInnerHTML>
              {canvas.summary}
            </LocaleString>
          ) : null}
        </div>
        <div className="grid max-h-[62vh] grid-cols-1 gap-3 overflow-y-auto pr-1">
          {steps.length ? (
            steps.map((step, stepIndex) => {
              const selected = stepIndex === currentStep || (!steps[currentStep] && stepIndex === 0);
              return (
                <button
                  key={step.annotationId || `${canvas.id}-${stepIndex}`}
                  type="button"
                  className={[
                    "group grid grid-cols-[3rem_minmax(0,1fr)] gap-3 rounded border p-3 text-left transition",
                    selected
                      ? "border-white bg-white text-zinc-950"
                      : "border-white/15 bg-white/5 text-white hover:border-white/45 hover:bg-white/10",
                  ].join(" ")}
                  onClick={() => goToStep(stepIndex)}
                >
                  <span
                    className={[
                      "flex aspect-square items-center justify-center rounded font-mono text-sm",
                      selected ? "bg-zinc-950 text-white" : "bg-white/10 text-white/70 group-hover:bg-white/20",
                    ].join(" ")}
                  >
                    {stepIndex + 1}
                  </span>
                  <span className="min-w-0">
                    <LocaleString as="span" className="block truncate text-sm font-semibold">
                      {step.label}
                    </LocaleString>
                    {step.summary ? (
                      <LocaleString
                        as="span"
                        className={["mt-1 line-clamp-2 text-xs leading-relaxed", selected ? "text-zinc-600" : "text-white/55"].join(" ")}
                        enableDangerouslySetInnerHTML
                      >
                        {step.summary}
                      </LocaleString>
                    ) : null}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="rounded border border-dashed border-white/20 p-5 text-sm text-white/60">
              Add annotations to this canvas to build a compact deck.
            </div>
          )}
        </div>
        {selectedStep?.objectLink?.component ? <div className="mt-4">{selectedStep.objectLink.component}</div> : null}
      </div>
    </section>
  );
}

import type { Runtime } from "@atlas-viewer/atlas";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LocaleString, useCanvas, useVault } from "react-iiif-vault";
import { useStore } from "zustand";
import { CanvasPreviewBlock, type CanvasPreviewBlockProps } from "../CanvasPreviewBlock";
import { ScrollPanelSection } from "./ScrollPanelSection";
import { createExhibitionStore, type ExhibitionStep } from "../../helpers/exhibition-store";
import { formatScrollContent, useScrollContent } from "../../helpers/scroll-content";
import { useStepDetails } from "../../helpers/use-step-details";
import { useScrollTheme } from "../../theme/scroll-theme";

export interface ScrollCompactDeckBlockProps {
  canvas: CanvasNormalized;
  id?: string;
  index: number;
  objectLinks?: CanvasPreviewBlockProps["objectLinks"];
}

export function ScrollCompactDeckBlock({ canvas, id, index, objectLinks }: ScrollCompactDeckBlockProps) {
  const vault = useVault();
  const content = useScrollContent();
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
  const hasCanvasLabel = Boolean(canvas.label);

  useEffect(() => {
    if (!runtime || !selectedStep) return;
    const spatial = selectedStep.region?.selector?.spatial;
    if (spatial) {
      runtime.world.gotoRegion({ ...(spatial as any), padding: 80 });
      return;
    }
    runtime.world.goHome();
  }, [runtime, selectedStep]);

  const dropRuntime = useCallback(() => setRuntime(null), []);

  if (!currentCanvas) return null;

  return (
    <ScrollPanelSection
      id={id || `${index}`}
      renderViewer={() => (
        <CanvasPreviewBlock
          canvasId={canvas.id}
          index={index}
          objectLinks={objectLinks}
          disablePopup
          interactive
          cover={false}
          setRuntime={setRuntime}
          viewerBackground={viewerBackground}
          useBlurBackground={useBlurBackground}
          ignoreCanvasBackgrounds={ignoreCanvasBackgrounds}
        />
      )}
      onViewerUnmount={dropRuntime}
      panelClassName="justify-center"
    >
      <div className="mb-6">
        <div className="font-mono text-xs uppercase tracking-[0.16em] opacity-60">{content.imageDeck}</div>
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
      <div className="grid grid-cols-1 gap-3">
        {steps.length ? (
          steps.map((step, stepIndex) => (
            <CompactDeckStep
              key={step.annotationId || `${canvas.id}-${stepIndex}`}
              canvas={canvas}
              step={step}
              index={stepIndex}
              selected={step === selectedStep}
              onSelect={() => goToStep(stepIndex)}
            />
          ))
        ) : (
          <div className="rounded border border-dashed border-ControlBarBorder p-5 text-sm opacity-70">
            {content.addAnnotationsDeck}
          </div>
        )}
      </div>
      {selectedStep?.objectLink?.component ? <div className="mt-4">{selectedStep.objectLink.component}</div> : null}
    </ScrollPanelSection>
  );
}

function CompactDeckStep({ canvas, step, index, selected, onSelect }: {
  canvas: CanvasNormalized;
  step: ExhibitionStep;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const content = useScrollContent();
  const { label, summary, toShow } = useStepDetails(canvas, step);
  const textBody = toShow.find((body) => body.type === "TextualBody");
  return (
    <button
      type="button"
      aria-current={selected ? "step" : undefined}
      className={[
        "group grid grid-cols-[3rem_minmax(0,1fr)] gap-3 rounded border p-3 text-left transition",
        selected
          ? "border-InfoBlockText bg-InfoBlockText text-InfoBlock"
          : "border-ControlBarBorder hover:bg-ControlHover",
      ].join(" ")}
      onClick={onSelect}
    >
      <span
        aria-hidden="true"
        className={[
          "flex aspect-square items-center justify-center rounded font-mono text-sm",
          selected ? "bg-InfoBlock text-InfoBlockText" : "bg-ControlHover opacity-80",
        ].join(" ")}
      >
        {index + 1}
      </span>
      <span className="min-w-0">
        <LocaleString as="span" className="block truncate text-sm font-semibold">
          {label || formatScrollContent(content.tourStopFallback, index + 1)}
        </LocaleString>
        {summary || textBody?.value ? (
          <LocaleString
            as="span"
            className="mt-1 line-clamp-2 text-xs leading-relaxed opacity-70"
            enableDangerouslySetInnerHTML
          >
            {summary || textBody?.value}
          </LocaleString>
        ) : null}
      </span>
    </button>
  );
}

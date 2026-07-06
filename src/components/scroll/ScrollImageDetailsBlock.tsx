import { NextIcon } from "@/components/icons/NextIcon";
import { PreviousIcon } from "@/components/icons/PreviousIcon";
import type { Runtime } from "@atlas-viewer/atlas";
import { expandTarget } from "@iiif/helpers";
import type { AnnotationNormalized, CanvasNormalized } from "@iiif/presentation-3-normalized";
import { useEffect, useMemo, useState } from "react";
import { LocaleString, useVault } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { useStore } from "zustand";
import { CanvasPreviewBlock, type CanvasPreviewBlockProps } from "../CanvasPreviewBlock";
import { createExhibitionStore } from "../../helpers/exhibition-store";
import { useStepDetails } from "../../helpers/use-step-details";
import { useScrollTheme } from "../../theme/scroll-theme";

export interface ScrollImageDetailsBlockProps {
  canvas: CanvasNormalized;
  id?: string;
  index: number;
  objectLinks?: CanvasPreviewBlockProps["objectLinks"];
}

type ImageDetailsItem = {
  id: string;
  label: any;
  summary: any;
  region: any;
};

function emptyLabel(index: number) {
  return { none: [`Image ${index + 1}`] };
}

export function ScrollImageDetailsBlock({ canvas, id, index, objectLinks }: ScrollImageDetailsBlockProps) {
  const vault = useVault();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const {
    tourBlock: { viewerBackground, useBlurBackground = false },
  } = useScrollTheme();

  const tourStore = useMemo(
    () =>
      createExhibitionStore({
        vault: vault as any,
        canvases: [canvas as any],
        objectLinks,
        firstStep: false,
      }),
    [vault, canvas, objectLinks],
  );
  const tourSteps = useStore(tourStore, (store) => store.steps);

  const paintingItems = useMemo<ImageDetailsItem[]>(() => {
    const paintingPage = canvas.items[0] ? vault.get(canvas.items[0]) : null;

    return (paintingPage?.items || [])
      .map((item: any, itemIndex: number) => {
        const annotation = vault.get<AnnotationNormalized>(item);
        const body = annotation?.body?.[0] ? vault.get(annotation.body[0]) : null;
        const target = Array.isArray(annotation?.target) ? annotation?.target[0] : annotation?.target;
        const region = target ? expandTarget(target as any)?.selector?.spatial : null;

        if (!annotation || !body || body.type !== "Image") {
          return null;
        }

        const itemLabel = annotation.label || (body as any).label || emptyLabel(itemIndex);
        const itemSummary = annotation.summary || (body as any).summary || null;

        return {
          id: annotation.id || `${canvas.id}/image-details/${itemIndex}`,
          label: itemLabel,
          summary: itemSummary,
          region,
        } satisfies ImageDetailsItem;
      })
      .filter(Boolean) as ImageDetailsItem[];
  }, [canvas, vault]);

  const tourItems = useMemo<ImageDetailsItem[]>(() => {
    const annotationItems = tourSteps
      .map((step, stepIndex) => ({
        id: step.annotationId || `${canvas.id}/tour-step/${stepIndex}`,
        label: step.label || emptyLabel(stepIndex),
        summary: step.summary || null,
        region: step.region?.selector?.spatial || null,
      }))
      .filter((item) => item.region || item.label || item.summary);

    if (!annotationItems.length) {
      return [];
    }

    return [
      {
        id: `${canvas.id}/tour-step/canvas`,
        label: canvas.label,
        summary: canvas.summary || null,
        region: null,
      },
      ...annotationItems,
    ];
  }, [canvas.id, tourSteps]);

  const items = tourItems.length ? tourItems : paintingItems;
  const selectedStep = tourItems.length && currentIndex > 0 ? tourSteps[currentIndex - 1] || null : null;
  const selectedItem = items[currentIndex] || items[0] || null;
  const { label, summary, showBody, toShow } = useStepDetails(canvas, selectedStep);
  const displayLabel = tourItems.length ? label : selectedItem?.label;
  const displaySummary = tourItems.length ? summary : selectedItem?.summary;
  const panelSide = canvas.behavior?.includes("left") ? "left" : "right";
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  useEffect(() => {
    if (items.length && currentIndex >= items.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, items.length]);

  useEffect(() => {
    if (!runtime || !selectedItem) return;

    if (selectedItem.region) {
      runtime.world.gotoRegion({
        ...selectedItem.region,
        padding: 80,
      });
      return;
    }
    runtime.world.goHome();
  }, [runtime, selectedItem]);

  if (!items.length) {
    return (
      <section id={id || `${index}`} className="relative h-screen min-h-screen bg-black">
        <CanvasPreviewBlock
          canvasId={canvas.id}
          cover
          index={index}
          objectLinks={objectLinks}
          alternativeMode
          disablePopup
          viewerBackground={viewerBackground}
          useBlurBackground={useBlurBackground}
        />
      </section>
    );
  }

  if (!selectedItem) return null;

  return (
    <section
      id={id || `${index}`}
      className={twMerge(
        "grid min-h-screen bg-zinc-950 text-white",
        panelSide === "left" ? "lg:grid-cols-[420px_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_420px]",
      )}
    >
      <div className={twMerge("relative h-[62vh] lg:h-screen", panelSide === "left" ? "lg:order-2" : "")}>
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
        />
      </div>

      <aside
        className={twMerge(
          "flex min-w-0 flex-col border-t border-white/10 bg-zinc-950/95 p-5 lg:border-t-0 lg:p-8",
          panelSide === "left" ? "lg:order-1 lg:border-r" : "lg:border-l",
        )}
      >
        <div className="mb-6">
          <div className="min-w-0">
            <LocaleString as="h2" className="mt-2 text-2xl font-semibold leading-tight break-words">
              {displayLabel}
            </LocaleString>
          </div>
        </div>

        {displaySummary ? (
          <LocaleString className="block min-w-0 break-words text-sm leading-relaxed text-white/70" enableDangerouslySetInnerHTML>
            {displaySummary}
          </LocaleString>
        ) : null}
        {selectedStep && showBody && toShow
          ? (toShow || []).map((body, bodyIndex) => {
              if (body.type === "TextualBody") {
                return (
                  <div className={twMerge("mt-4 min-w-0 break-words text-sm leading-relaxed text-white/80")} key={bodyIndex}>
                    <LocaleString enableDangerouslySetInnerHTML>{body.value}</LocaleString>
                  </div>
                );
              }
              return null;
            })
          : null}
        {selectedStep?.objectLink ? (selectedStep.objectLink as any).component : null}

        <div className="mt-auto grid min-w-0 grid-cols-2 gap-3 pt-8">
          <button
            type="button"
            className="flex min-h-12 min-w-0 items-center justify-center gap-2 whitespace-normal border border-white/15 px-3 py-2 font-mono text-sm leading-tight text-white/80 hover:border-white/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!hasPrevious}
            onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
          >
            <PreviousIcon className="shrink-0" />
            <span className="min-w-0 break-words">Previous</span>
          </button>
          <button
            type="button"
            className="flex min-h-12 min-w-0 items-center justify-center gap-2 whitespace-normal border border-white/15 px-3 py-2 font-mono text-sm leading-tight text-white/80 hover:border-white/45 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            disabled={!hasNext}
            onClick={() => setCurrentIndex((current) => Math.min(items.length - 1, current + 1))}
          >
            <span className="min-w-0 break-words">Next</span>
            <NextIcon className="shrink-0" />
          </button>
        </div>
      </aside>
    </section>
  );
}

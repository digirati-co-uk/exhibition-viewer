import { NextIcon } from "@/components/icons/NextIcon";
import { PreviousIcon } from "@/components/icons/PreviousIcon";
import type { Runtime } from "@atlas-viewer/atlas";
import { expandTarget } from "@iiif/helpers";
import type { AnnotationNormalized, CanvasNormalized } from "@iiif/presentation-3-normalized";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LocaleString, useVault } from "react-iiif-vault";
import { useStore } from "zustand";
import { CanvasPreviewBlock, type CanvasPreviewBlockProps } from "../CanvasPreviewBlock";
import { createExhibitionStore } from "../../helpers/exhibition-store";
import { getPaintingItemRefs } from "../../helpers/canvas-pages";
import { formatScrollContent, useScrollContent } from "../../helpers/scroll-content";
import { useLazyMount } from "../../helpers/use-lazy-mount";
import { useStepDetails } from "../../helpers/use-step-details";
import { ScrollPanelSection } from "./ScrollPanelSection";
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

function emptyLabel(template: string, index: number) {
  return { none: [formatScrollContent(template, index + 1)] };
}

export function ScrollImageDetailsBlock({ canvas, id, index, objectLinks }: ScrollImageDetailsBlockProps) {
  const vault = useVault();
  const content = useScrollContent();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const {
    tourBlock: { viewerBackground, useBlurBackground = false, ignoreCanvasBackgrounds },
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
    const paintingAnnotations = getPaintingItemRefs(vault, canvas);

    return paintingAnnotations
      .map((item: any, itemIndex: number) => {
        const annotation = vault.get<AnnotationNormalized>(item);
        const resource = annotation?.body?.[0] ? vault.get(annotation.body[0]) : null;
        const body = resource?.type === "SpecificResource" ? vault.get(resource.source) : resource;
        const target = Array.isArray(annotation?.target) ? annotation?.target[0] : annotation?.target;
        const region = target ? expandTarget(target as any)?.selector?.spatial : null;

        if (!annotation || !body || body.type !== "Image") {
          return null;
        }

        const itemLabel = annotation.label || (body as any).label || emptyLabel(content.imageLabel, itemIndex);
        const itemSummary = annotation.summary || (body as any).summary || null;

        return {
          id: annotation.id || `${canvas.id}/image-details/${itemIndex}`,
          label: itemLabel,
          summary: itemSummary,
          region,
        } satisfies ImageDetailsItem;
      })
      .filter(Boolean) as ImageDetailsItem[];
  }, [canvas, vault, content.imageLabel]);

  const tourItems = useMemo<ImageDetailsItem[]>(() => {
    const annotationItems = tourSteps
      .map((step, stepIndex) => ({
        id: step.annotationId || `${canvas.id}/tour-step/${stepIndex}`,
        label: step.label || emptyLabel(content.imageLabel, stepIndex),
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
  }, [canvas.id, tourSteps, content.imageLabel]);

  const items = tourItems.length ? tourItems : paintingItems;
  const selectedStep = tourItems.length && currentIndex > 0 ? tourSteps[currentIndex - 1] || null : null;
  const selectedItem = items[currentIndex] || items[0] || null;
  const { label, summary, showBody, toShow } = useStepDetails(canvas, selectedStep);
  const displayLabel = tourItems.length ? label : selectedItem?.label;
  const displaySummary = tourItems.length ? summary : selectedItem?.summary;
  const hasDisplayLabel = Boolean(displayLabel);
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

  const dropRuntime = useCallback(() => setRuntime(null), []);

  if (!items.length) {
    return (
      <ScrollCoverSection id={id || `${index}`}>
        <CanvasPreviewBlock
          canvasId={canvas.id}
          cover
          index={index}
          objectLinks={objectLinks}
          disablePopup
          viewerBackground={viewerBackground}
          useBlurBackground={useBlurBackground}
          ignoreCanvasBackgrounds={ignoreCanvasBackgrounds}
        />
      </ScrollCoverSection>
    );
  }

  if (!selectedItem) return null;

  return (
    <ScrollPanelSection
      id={id || `${index}`}
      side={panelSide}
      onViewerUnmount={dropRuntime}
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
    >
      <div className="mb-6">
        <div className="min-w-0">
          {displayLabel ? (
            <LocaleString as="h2" className="mt-2 text-2xl font-semibold leading-tight break-words">
              {displayLabel}
            </LocaleString>
          ) : null}
        </div>
      </div>

      {displaySummary ? (
        <LocaleString
          className={["block min-w-0 break-words text-sm leading-relaxed", hasDisplayLabel ? "opacity-75" : ""].join(" ")}
          enableDangerouslySetInnerHTML
        >
          {displaySummary}
        </LocaleString>
      ) : null}
      {selectedStep && showBody && toShow
        ? (toShow || []).map((body, bodyIndex) => {
            if (body.type === "TextualBody") {
              return (
                <div className="mt-4 min-w-0 break-words text-sm leading-relaxed opacity-90" key={bodyIndex}>
                  <LocaleString enableDangerouslySetInnerHTML>{body.value}</LocaleString>
                </div>
              );
            }
            return null;
          })
        : null}
      {selectedStep?.objectLink ? (selectedStep.objectLink as any).component : null}

      <div className="sticky bottom-0 mt-auto grid min-w-0 grid-cols-2 gap-3 bg-InfoBlock pt-8 pb-1">
        <button
          type="button"
          className={navButtonClassName}
          disabled={!hasPrevious}
          onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
        >
          <PreviousIcon aria-hidden="true" className="shrink-0" />
          <span className="min-w-0 break-words">{content.previous}</span>
        </button>
        <button
          type="button"
          className={navButtonClassName}
          disabled={!hasNext}
          onClick={() => setCurrentIndex((current) => Math.min(items.length - 1, current + 1))}
        >
          <span className="min-w-0 break-words">{content.next}</span>
          <NextIcon aria-hidden="true" className="shrink-0" />
        </button>
      </div>
    </ScrollPanelSection>
  );
}

const navButtonClassName =
  "flex min-h-12 min-w-0 items-center justify-center gap-2 whitespace-normal border border-ControlBarBorder px-3 py-2 font-mono text-sm leading-tight hover:bg-ControlHover disabled:cursor-not-allowed disabled:opacity-35";

/** A full-screen section that mounts its viewer one screen ahead of the scroll position. */
function ScrollCoverSection({ id, children }: { id: string; children: React.ReactNode }) {
  const [ref, shouldMount] = useLazyMount();
  return (
    <section
      id={id}
      ref={ref}
      className="relative h-[var(--exv-screen,100vh)] bg-ViewerBackground"
    >
      {shouldMount ? children : null}
    </section>
  );
}

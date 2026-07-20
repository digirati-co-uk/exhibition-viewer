import { CloseIcon } from "@/components/icons/CloseIcon";
import { HTMLPortal, type DefaultPresetOptions, type Preset, type Runtime } from "@atlas-viewer/atlas";
import { ExhibitionDialog as Dialog } from "@/theme/exhibition-theme-context";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useHover } from "react-aria";
import { CanvasContext, CanvasPanel, useCanvas, useVault } from "react-iiif-vault";
import { LocaleString } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import invariant from "tiny-invariant";
import { useStore } from "zustand";
import { createExhibitionStore } from "../helpers/exhibition-store";
import type { ObjectLink } from "../helpers/object-links";
import { useCanvasHighlights } from "../helpers/use-canvas-highlights";
import { withViewTransition } from "../helpers/with-view-transition";
import { Hookable } from "./EditorHooks";
import { RenderSeeAlso } from "./RenderSeeAlso";
import { ViewerZoomControls } from "./ViewerZoomControls";
import { VisibleAnnotationsListingItem } from "./VisibleAnnotationListItem";
import { InfoIcon } from "./icons/InfoIcon";
import { BlurCanvasImage } from "./shared/BlurCanvasImage";
import { TourMarkerButton, type TourMarkerStyle } from "./shared/NonLinearTourCanvas";

export interface CanvasPreviewBlockProps {
  canvasId?: string;
  highlightOverlays?: Array<{ highlight: any; opacity: number }>;
  cover?: boolean;
  autoPlay?: boolean;
  transitionScale?: boolean;
  imageInfoIcon?: boolean;
  index: number;
  disablePopup?: boolean;
  objectLinks?: Array<ObjectLink>;
  viewTransition?: boolean;
  padding?: {
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
  };
  setRuntime?: (runtime: Runtime) => void;
  interactive?: boolean;
  viewerBackground?: string;
  useBlurBackground?: boolean;
  ignoreCanvasBackgrounds?: boolean;
  showCaption?: boolean;
  showDefaultAnnotationHover?: boolean;
}

const EMPTY_OBJECT_LINKS: ObjectLink[] = [];

function sameSpatial(a: any, b: any) {
  return a && b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

function CanvasPreviewBlockInner({
  cover,
  highlightOverlays,
  index,
  autoPlay = false,
  objectLinks = EMPTY_OBJECT_LINKS,
  transitionScale = false,
  imageInfoIcon = false,
  viewTransition = false,
  disablePopup = false,
  padding,
  setRuntime,
  interactive = false,
  useBlurBackground = false,
  viewerBackground,
  ignoreCanvasBackgrounds = false,
  showCaption = true,
  showDefaultAnnotationHover = false,
}: CanvasPreviewBlockProps) {
  const container = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const vault = useVault();
  const canvas = useCanvas();
  const markerStyle: TourMarkerStyle = canvas?.behavior?.includes("tour-marker-pin") ? "pin" : "circle";
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
  const paintingPage = canvas?.items[0] ? vault.get(canvas.items[0]) : null;
  const hasMultipleAnnotations = (paintingPage?.items.length || 0) > 1;

  const { currentStep, goToStep, pause, play, steps } = useStore(store);
  const highlights = useCanvasHighlights();

  const stepIndex = currentStep;
  const step = currentStep === -1 ? null : steps[currentStep];

  useEffect(() => {
    if (isOpen && autoPlay) {
      play();
    }
    if (!isOpen) {
      goToStep(-1);
      pause();
    }
  }, [isOpen, autoPlay, goToStep, pause, play]);

  const [hovered, setHovered] = useState<number | null>(null);

  const { hoverProps } = useHover({
    onHoverStart: (e) => {
      const stepIdx = e.target.dataset.stepId;
      if (typeof stepIdx !== "undefined" && stepIdx !== "") {
        const stepIndex = Number.parseInt(stepIdx, 10);
        setHovered(stepIndex);
      }
    },
    onHoverEnd: () => {
      setHovered(null);
    },
  });

  const atlas = useRef<Preset | null>(null);
  const [isReady, setIsReady] = useState(false);

  const config = useMemo(
    () =>
      [
        "default-preset",
        {
          runtimeOptions: { visibilityRatio: 0.5 },
          interactive,
        } as DefaultPresetOptions,
      ] as any,
    [interactive],
  );

  const openConfig = useMemo(
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

  invariant(canvas);

  const resolvedViewerBackground =
    !ignoreCanvasBackgrounds && typeof (canvas as any).backgroundColor === "string"
      ? (canvas as any).backgroundColor
      : viewerBackground;

  useLayoutEffect(() => {
    if (atlas.current && isReady && step) {
      if (step?.region?.selector?.type === "BoxSelector" || step?.region?.selector?.type === "SvgSelector") {
        atlas.current.runtime.world.gotoRegion({
          ...(step.region?.selector?.spatial as any),
          padding: 50,
        });
      } else if (step) {
        atlas.current?.runtime.world.goHome();
      }
    }
    if (currentStep === -1) {
      atlas.current?.runtime.world.goHome();
    }
  }, [step, currentStep, isReady]);

  const objectLink = useMemo(() => {
    if (objectLinks.length === 1) {
      return objectLinks[0];
    }

    return null;
  }, [objectLinks]);
  const compactModal = Boolean(
    canvas.label &&
      !canvas.summary &&
      !canvas.seeAlso?.length &&
      steps.length === 0 &&
      !objectLink,
  );

  const containerStyle = useMemo(
    () => ({
      height: "100%",
      pointerEvents: isOpen ? undefined : "none",
      // viewTransitionName: isOpen ? "" : `canvas-preview-block-${index}`,
    }),
    [isOpen],
  );

  const onCreated = useCallback((preset: Preset) => {
    const clear = preset.runtime.registerHook("useAfterFrame", () => {
      const renderers = (preset.renderer as any).renderers;
      const canvasRenderer = renderers[0]?.canvas ? renderers[0] : null;
      if (!canvasRenderer) {
        setIsReady(true);
        clear();
      }
      if ((canvasRenderer as any).isReady()) {
        preset.runtime.updateNextFrame();
        setTimeout(() => {
          setIsReady(true);
        }, 300);
        clear();
      }
    });
    setTimeout(() => preset.runtime.updateNextFrame(), 1000);
    if (setRuntime) {
      setRuntime(preset.runtime);
    }
  }, []);

  return (
    <>
      <div
        ref={container}
        className={twMerge(
          "exhibition-canvas-panel z-10 h-full relative bg-ViewerBackground canvas-preview-transition",
          transitionScale && "hover:scale-105 transition-transform duration-1000",
        )}
        onClick={withViewTransition(
          container.current,
          () => setIsOpen(true),
          `canvas-preview-block-${index}`,
          false,
          viewTransition,
        )}
        onKeyDown={() => undefined}
        style={
          resolvedViewerBackground
            ? ({
                "--delft-viewer-background": resolvedViewerBackground,
                "--atlas-background": resolvedViewerBackground,
              } as any)
            : {}
        }
      >
        {useBlurBackground ? <BlurCanvasImage /> : null}
        <Hookable type="canvasPreviewEditor" resource={canvas}>
          <CanvasPanel.Viewer
            containerStyle={containerStyle}
            renderPreset={config}
            homeOnResize
            homeCover={typeof cover === "boolean" ? cover : !hasMultipleAnnotations}
            padding={padding}
            onCreated={onCreated}
            background={resolvedViewerBackground}
          >
            <CanvasPanel.RenderCanvas strategies={["images"]} enableSizes={false}>
              <Highlights overlays={highlightOverlays} />
            </CanvasPanel.RenderCanvas>
          </CanvasPanel.Viewer>
        </Hookable>
      </div>
      {imageInfoIcon && (
        <div className="absolute top-4 right-4 z-20 text-ImageCaption text-2xl pointer-events-none">
          <InfoIcon />
        </div>
      )}
      {showCaption && (canvas.label || canvas.requiredStatement) ? (
        <div className="absolute bottom-1 left-0 right-0 z-20 text-center font-mono text-[11px] leading-tight text-ImageCaption">
          <div className="image-caption-inline inline-flex max-w-[calc(100%_-_1rem)] flex-col gap-0.5 px-2">
            {canvas.label ? (
              <Hookable type="localeStringEditor" property="label" resource={canvas}>
                <LocaleString>{canvas.label}</LocaleString>
              </Hookable>
            ) : null}
            {canvas.requiredStatement ? (
              <LocaleString className="opacity-80">{canvas.requiredStatement.value}</LocaleString>
            ) : null}
          </div>
        </div>
      ) : null}
      {!disablePopup ? (
        <Dialog
          className="exhibition-viewer exhibition-viewer-dialog"
          open={isOpen}
          onClose={withViewTransition(
            container.current,
            () => setIsOpen(false),
            `canvas-preview-block-${index}`,
            true,
            viewTransition,
          )}
        >
          <div className="fixed modal-top left-0 right-0 bottom-0 bg-black/30" aria-hidden="true" />
          <div className="safe-inset fill-height fixed modal-top left-0 right-0 bottom-0 z-20 flex w-screen items-center md:p-4">
            <button
              type="button"
              onClick={withViewTransition(
                container.current,
                () => setIsOpen(false),
                `canvas-preview-block-${index}`,
                true,
                viewTransition,
              )}
              className="absolute right-4 top-4 z-20 flex  h-16 w-16 items-center justify-center bg-CloseBackground text-CloseText hover:bg-CloseBackgroundHover"
            >
              <CloseIcon fill="currentColor" />
            </button>
            <Dialog.Panel className="relative z-10 flex h-full w-full flex-col justify-center bg-InfoBlock text-InfoBlockText overflow-y-auto overflow-x-hidden md:rounded lg:flex-row">
              <div
                className="exhibition-canvas-panel flex-shink-0 sticky top-0 z-20 min-h-0 flex-1 bg-ViewerBackground lg:relative lg:order-2 lg:min-w-0"
                style={{
                  viewTransitionName: isOpen ? `canvas-preview-block-${index}` : "",
                  ...(resolvedViewerBackground
                    ? ({
                        "--delft-viewer-background": resolvedViewerBackground,
                        "--atlas-background": resolvedViewerBackground,
                      } as any)
                    : {}),
                }}
              >
                {isOpen ? (
                  <CanvasPanel.Viewer
                    onCreated={(ctx) => {
                      atlas.current = ctx;
                      if (setRuntime) {
                        setRuntime(ctx.runtime);
                      }
                    }}
                    containerStyle={{ height: "100%", minHeight: 0 }}
                    runtimeOptions={openConfig[1].runtimeOptions}
                    renderPreset={openConfig}
                    background={resolvedViewerBackground}
                  >
                    <CanvasPanel.RenderCanvas
                      strategies={["images"]}
                      enableSizes={false}
                      renderViewerControls={() => <ViewerZoomControls />}
                    >
                      <Highlights overlays={highlightOverlays} />

                      {steps.map((step, index) => {
                        if (step.region?.selector?.spatial) {
                          const region = step.region.selector.spatial as any;
                          if (
                            region.x === 0 &&
                            region.y === 0 &&
                            region.width === canvas?.width &&
                            region.height === canvas?.height
                          ) {
                            return null;
                          }

                          if (markerStyle === "pin") {
                            return (
                              <HTMLPortal
                                key={`hover-overlays-${index}`}
                                target={step.region.selector.spatial as any}
                                relative
                                interactive={false}
                                style={{
                                  overflow: "visible",
                                  pointerEvents: "none",
                                }}
                              >
                                <TourMarkerButton
                                  ariaLabel={`Open tour stop ${index + 1}`}
                                  markerStyle={markerStyle}
                                  selected={false}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    goToStep(index);
                                  }}
                                />
                              </HTMLPortal>
                            );
                          }

                          const isHovered = hovered === index;
                          const isSelected = stepIndex === index;
                          const highlight = highlights.find(
                            (highlight: any) =>
                              (step.annotationId && highlight.annotationId === step.annotationId) ||
                              sameSpatial(highlight?.selector?.spatial, step.region?.selector?.spatial),
                          ) as any;
                          const boxStyle = highlight?.selector?.boxStyle || null;
                          const hasBoxStyle = boxStyle && Object.keys(boxStyle).length > 0;
                          const inactiveStyle = {
                            backgroundColor: "rgba(255, 255, 255, 0)",
                            border: "2px solid transparent",
                            borderColor: "transparent",
                            outline: "2px solid transparent",
                            outlineOffset: "4px",
                            ...(showDefaultAnnotationHover
                              ? {
                                  ":hover": {
                                    border: "2px solid transparent",
                                    borderColor: "transparent",
                                    outline: "2px solid rgb(250, 204, 21)",
                                  },
                                }
                              : {}),
                          };
                          const hoverStyle = isHovered || isSelected
                            ? hasBoxStyle
                              ? boxStyle
                              : showDefaultAnnotationHover
                                ? {
                                    border: "2px solid transparent",
                                    borderColor: "transparent",
                                    outline: "2px solid rgb(250, 204, 21)",
                                    outlineOffset: "4px",
                                  }
                                : {}
                            : inactiveStyle;

                          if (step.region.selector.type === "SvgSelector") {
                            const Shape = "shape" as any;
                            return (
                              <Shape
                                key={`hover-overlays-${index}`}
                                points={(highlight?.selector || step.region.selector).points}
                                relativeStyle
                                target={{ x: 0, y: 0, width: canvas.width, height: canvas.height }}
                                onClick={(e: any) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  goToStep(index);
                                }}
                                style={hoverStyle}
                              />
                            );
                          }

                          return (
                            <box
                              key={`hover-overlays-${index}`}
                              target={step.region.selector.spatial as any}
                              relativeStyle
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                goToStep(index);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  goToStep(index);
                                }
                              }}
                              onKeyUp={() => undefined}
                              onKeyPress={() => undefined}
                              html
                              style={hoverStyle}
                            />
                          );
                        }
                        return null;
                      })}
                    </CanvasPanel.RenderCanvas>
                  </CanvasPanel.Viewer>
                ) : null}
                {compactModal ? (
                  <div className="absolute bottom-0 left-0 right-0 z-20 bg-InfoBlock px-8 py-4 pr-24 text-InfoBlockText">
                    <Hookable type="localeStringEditor" property="label" resource={canvas}>
                      <LocaleString as="h2" className="font-mono delft-title">
                        {canvas.label}
                      </LocaleString>
                    </Hookable>
                    {canvas.requiredStatement ? (
                      <LocaleString as="div" className="annotation-summary mt-1 text-sm">
                        {canvas.requiredStatement.value}
                      </LocaleString>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {compactModal ? null : <div className="z-10 max-h-[40vh] w-full overflow-y-auto text-InfoBlockText lg:order-1 lg:max-h-[100vh] lg:max-w-md">
                {canvas.label || canvas.summary || canvas.seeAlso?.length ? (
                  <div className="mb-4 bg-InfoBlock text-InfoBlockText px-8">
                    <div>
                      <Hookable type="localeStringEditor" property="label" resource={canvas}>
                        <LocaleString as="h2" className="sticky top-0 bg-InfoBlock pb-4 pt-6 font-mono delft-title">
                          {canvas.label}
                        </LocaleString>
                      </Hookable>
                      <Hookable type="localeStringEditor" property="summary" resource={canvas}>
                        <LocaleString className="whitespace-pre-wrap" enableDangerouslySetInnerHTML>
                          {canvas.summary}
                        </LocaleString>
                      </Hookable>
                    </div>
                    {canvas.requiredStatement && (
                      <div className="mt-8 text-sm opacity-60">
                        <LocaleString>{canvas.requiredStatement.value}</LocaleString>
                      </div>
                    )}
                    {canvas.seeAlso?.length ? <RenderSeeAlso resource={canvas.seeAlso[0]} /> : null}
                  </div>
                ) : null}
                {steps.length === 0 ? <div>{objectLink?.component || null}</div> : null}
                {steps.length > 1 ? (
                  <div className="flex flex-col gap-6 bg-InfoBlock text-InfoBlockText px-8 pb-8">
                    <h3 className="sticky top-0 bg-InfoBlock pb-4 pt-6 font-mono delft-title">Annotations</h3>
                    {steps.map((step, index) => {
                      return (
                        <VisibleAnnotationsListingItem
                          key={`step-${index}`}
                          canvas={canvas}
                          goToStep={goToStep}
                          hoverProps={hoverProps}
                          index={index}
                          step={step}
                          stepIndex={stepIndex}
                        />
                      );
                    })}
                  </div>
                ) : null}
              </div>}
            </Dialog.Panel>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}

export function CanvasPreviewBlock(props: CanvasPreviewBlockProps) {
  const inner = props.canvasId ? (
    <CanvasContext canvas={props.canvasId}>
      <CanvasPreviewBlockInner {...props} />
    </CanvasContext>
  ) : (
    <CanvasPreviewBlockInner {...props} />
  );

  return <div className="relative h-full w-full bg-ViewerBackground">{inner}</div>;
}

function Highlights({ overlays }: { overlays?: Array<{ highlight: any; opacity: number }> }) {
  const canvas = useCanvas();
  const highlights = useCanvasHighlights();
  const items = overlays === undefined ? highlights.map((highlight) => ({ highlight, opacity: 1 })) : overlays;
  if (!items || items.length === 0) return null;
  if (overlays === undefined && items.length > 1) return null;

  return (
    <>
      {items.map(({ highlight, opacity }, index) => {
        const target = highlight?.selector?.spatial as any;
        if (!target) return null;
        const clampedOpacity = Math.max(0, Math.min(1, opacity));
        const style = { ...(highlight.selector?.boxStyle || {}), opacity: clampedOpacity };

        if (highlight?.selector?.type === "SvgSelector" && canvas) {
          const Shape = "shape" as any;
          return (
            <Shape
              key={highlight.annotationId || `${highlight.selector.points}:${index}`}
              points={highlight.selector.points}
              relativeStyle
              target={{ x: 0, y: 0, width: canvas.width, height: canvas.height }}
              style={style}
            />
          );
        }

        return (
          <box
            key={highlight.annotationId || `${target.x}:${target.y}:${target.width}:${target.height}:${index}`}
            target={target}
            relativeStyle
            html
            style={style}
          />
        );
      })}
    </>
  );
}

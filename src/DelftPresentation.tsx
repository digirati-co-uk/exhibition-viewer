import type { Manifest } from "@iiif/presentation-3";
import { type CSSProperties, type ReactNode } from "react";
import { AtlasStoreProvider, LocaleString, useManifest } from "react-iiif-vault";
import "./styles/lib.css";
import { NextIcon } from "@/components/icons/NextIcon";
import { PauseIcon } from "@/components/icons/PauseIcon";
import { PlayIcon } from "@/components/icons/PlayIcon";
import { PreviousIcon } from "@/components/icons/PreviousIcon";
import { RestartIcon } from "@/components/icons/RestartIcon";
import { CanvasPreviewBlock } from "@/components/CanvasPreviewBlock";
import { ImageBlockPresentation } from "@/components/presentation/ImageBlockPresentation";
import { InfoBlockPresentation } from "@/components/presentation/InfoBlockPresentation";
import { MediaBlockPresentation } from "@/components/presentation/MediaBlockPresentation";
import { TableOfContentsBar } from "@/components/shared/TableOfContentsBar";
import { ExhibitionProvider, useExhibition } from "@/helpers/exhibition-store";
import { useExhibitionStore } from "@/hooks/use-exhibition-store";
import type { Vault } from "@iiif/helpers";
import { Provider } from "./components/Provider";
import { MapCanvasStrategy } from "./helpers/MapCanvasStrategy";
import {
  type DeepPartial,
  type ExhibitionThemeConfig,
  type FloatingPosition,
  getThemeCssVariables,
  mergeDefined,
  resolveThemeFromSources,
} from "./theme/exhibition-theme";

export type DelftPresentationProps = {
  manifest: Manifest | string;
  language?: string | undefined;
  canvasId?: string;
  annotationId?: string;
  viewObjectLinks?: Array<{
    service: string;
    slug: string;
    canvasId: string;
    targetCanvasId: string;
    component: ReactNode;
  }>;
  options?: {
    cutCorners?: boolean;
    autoPlay?: boolean;
    isFloating?: boolean;
    floatingPosition?: FloatingPosition;
    labelOnlyFloating?: boolean;
    ignoreCanvasBackgrounds?: boolean;
  };
  theme?: DeepPartial<ExhibitionThemeConfig>;
  useManifestTheme?: boolean;
  preferManifestStyle?: boolean;
  customVault?: Vault;
  skipLoadManifest?: boolean;
};

export function DelftPresentation(props: DelftPresentationProps) {
  const {
    //
    store,
    vault,
    state,
    step,
    toRenderables,
  } = useExhibitionStore(props);

  const isSingleStep = state.steps.length === 1;

  return (
    <ExhibitionProvider store={store}>
      <Provider manifest={props.manifest} customVault={props.customVault} skipLoadManifest={props.skipLoadManifest}>
        <PresentationInner {...props} />
      </Provider>
    </ExhibitionProvider>
  );
}

export default DelftPresentation;

export function PresentationInner(props: DelftPresentationProps) {
  const manifest = useManifest();
  const resolvedTheme = resolveThemeFromSources({
    manifest: manifest as any,
    theme: props.theme,
    useManifestTheme: props.useManifestTheme,
    preferManifestStyle: props.preferManifestStyle,
  });
  const resolvedOptions = mergeDefined(resolvedTheme.delft.presentation, props.options);
  const { cutCorners, floatingPosition, isFloating, labelOnlyFloating, ignoreCanvasBackgrounds } = resolvedOptions;
  const state = useExhibition();
  const step = state.currentStep === -1 ? null : state.steps[state.currentStep];
  const isSingleStep = state.steps.length === 1;
  const isFirstStep = state.currentStep <= 0;
  const isLastStep = state.currentStep >= state.steps.length - 1;

  if (!manifest) return;

  return (
    <div className="exhibition-viewer flex h-full w-full flex-col" style={getThemeCssVariables(resolvedTheme)}>
      <div
        data-cut-corners-enabled={cutCorners}
        className={"delft-presentation-viewer relative min-h-0 w-full flex-1 bg-black"}
      >
        <MapCanvasStrategy onlyCanvasId={props.canvasId} items={manifest.items || []}>
          {{
            "textual-content": ({ canvas, index, strategy }) => {
              const isActive = step?.canvasId === canvas.id;
              return (
                <InfoBlockPresentation
                  //
                  key={index}
                  index={index}
                  active={isActive}
                  canvas={canvas}
                  strategy={strategy}
                />
              );
            },
            images: ({ canvas, index, strategy }) => {
              const isActive = step?.canvasId === canvas.id;
              const foundLinks = (props.viewObjectLinks || []).filter((link) => link.canvasId === canvas.id);

              if (canvas.behavior?.includes("splash")) {
                return <PresentationSplashSlide key={index} active={isActive} canvas={canvas} index={index} manifest={manifest} />;
              }

              return (
                <ImageBlockPresentation
                  key={index}
                  active={isActive}
                  canvas={canvas}
                  index={index}
                  objectLinks={foundLinks}
                  isFloating={isFloating}
                  floatingPosition={floatingPosition || undefined}
                  labelOnlyFloating={labelOnlyFloating}
                  ignoreCanvasBackgrounds={ignoreCanvasBackgrounds}
                />
              );
            },

            media: ({ canvas, index, strategy }) => {
              const isActive = step?.canvasId === canvas.id;
              return (
                <MediaBlockPresentation
                  key={index}
                  active={isActive}
                  canvas={canvas}
                  strategy={strategy}
                  index={index}
                />
              );
            },
          }}
        </MapCanvasStrategy>
      </div>
      <div>
        <TableOfContentsBar
          content={{
            tableOfContents: manifest?.label || "Table of contents",
          }}
          hideTable={isSingleStep && !props.canvasId}
          enabledCanvasId={props.canvasId}
        >
          {!isSingleStep ? (
            <>
              <button
                type="button"
                className="z-50 flex h-10 w-10 items-center justify-center rounded hover:bg-black/10"
                onClick={state.playPause}
              >
                {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>

              <div className="relative flex w-16 items-center">
                <div className="h-1 w-full rounded-full bg-ProgressBar opacity-20" />
                <div
                  className="absolute left-0 top-0 h-1 rounded-full bg-ProgressBar transition-all"
                  style={{
                    width: `${(state.currentStep / (state.steps.length - 1)) * 100}%`,
                  }}
                />
              </div>

              <button
                type="button"
                className="z-50 flex h-10 w-10 items-center justify-center rounded hover:bg-black/10 disabled:pointer-events-none disabled:opacity-35"
                onClick={() => state.previousStep()}
                disabled={isFirstStep}
                aria-disabled={isFirstStep}
              >
                <PreviousIcon />
              </button>

              <button
                type="button"
                className="z-50 flex h-10 w-10 items-center justify-center rounded hover:bg-black/10"
                onClick={() => {
                  if (isLastStep) {
                    if (state.isPlaying) {
                      state.pause();
                    }
                    state.goToStep(0);
                    return;
                  }
                  state.nextStep();
                }}
              >
                {isLastStep ? <RestartIcon /> : <NextIcon />}
              </button>
            </>
          ) : null}
        </TableOfContentsBar>
      </div>
    </div>
  );
}

function PresentationSplashSlide({ active, canvas, index, manifest }: { active: boolean; canvas: any; index: number; manifest: Manifest }) {
  const invertSplash = canvas.behavior?.includes("invert");
  const splashBackground = typeof canvas.backgroundColor === "string" ? canvas.backgroundColor : null;

  return (
    <section
      className={`delft-slide override-scrollbars relative z-20 mb-8 items-center justify-center overflow-hidden bg-black p-6 text-center transition-opacity sm:p-10 ${active ? "opacity-100" : "opacity-0"} ${invertSplash ? "text-white" : "text-black"}`}
      style={splashBackground ? ({ "--exv-scroll-splash-overlay": splashBackground } as CSSProperties) : undefined}
    >
      <div className="exv-scroll-title-splash absolute inset-0 z-0">
        <AtlasStoreProvider name={`${canvas.id}-presentation-splash`}>
          <CanvasPreviewBlock canvasId={canvas.id} cover disablePopup index={index} showCaption={false} />
        </AtlasStoreProvider>
      </div>
      <div className={`relative z-20 flex w-full max-w-3xl flex-col gap-6 p-6 sm:p-8 ${splashBackground ? "" : `backdrop-blur-md ${invertSplash ? "bg-black/25" : "bg-white/25"}`}`}>
        <p className="text-xs uppercase tracking-[0.4em] opacity-60">Exhibition</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          <LocaleString>{manifest.label}</LocaleString>
        </h1>
        {manifest.summary ? (
          <LocaleString as="div" enableDangerouslySetInnerHTML className="text-lg leading-relaxed opacity-75">
            {manifest.summary}
          </LocaleString>
        ) : null}
        {manifest.requiredStatement ? (
          <div className="text-sm opacity-75">
            <div className="font-semibold">
              <LocaleString>{manifest.requiredStatement.label}</LocaleString>
            </div>
            <LocaleString>{manifest.requiredStatement.value}</LocaleString>
          </div>
        ) : null}
      </div>
    </section>
  );
}

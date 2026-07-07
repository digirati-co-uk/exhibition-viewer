import type { Manifest } from "@iiif/presentation-3";
import useEmblaCarousel from "embla-carousel-react";
import { type CSSProperties, type ReactNode, Suspense } from "react";
import { usePress } from "react-aria";
import { AtlasStoreProvider, LocaleString, VaultProvider, useExistingVault } from "react-iiif-vault";
import { CanvasPreviewBlock } from "./components/CanvasPreviewBlock";
import { ImageBlock } from "./components/exhibition/ImageBlock";
import { InfoBlock } from "./components/exhibition/InfoBlock";
import { MediaBlock } from "./components/exhibition/MediaBlock";
import { NextIcon } from "./components/icons/NextIcon";
import { PreviousIcon } from "./components/icons/PreviousIcon";
import { MapCanvasStrategy } from "./helpers/MapCanvasStrategy";
import {
  type DeepPartial,
  type ExhibitionThemeConfig,
  getThemeCssVariables,
  resolveThemeFromSources,
} from "./theme/exhibition-theme";

interface DelftSlideshowProps {
  manifest: Manifest;
  canvasId?: string;
  vaultManifestId?: string;
  language: string | undefined;
  viewObjectLinks?: Array<{
    service: string;
    slug: string;
    canvasId: string;
    targetCanvasId: string;
    component: ReactNode;
  }>;
  options?: {
    alternativeImageMode?: boolean;
    transitionScale?: boolean;
    imageInfoIcon?: boolean;
    coverImages?: boolean;
    ignoreCanvasBackgrounds?: boolean;
  };
  theme?: DeepPartial<ExhibitionThemeConfig>;
  useManifestTheme?: boolean;
  preferManifestStyle?: boolean;
  content?: {
    exhibition: string;
  };
}

export function DelftSlideshow(props: DelftSlideshowProps) {
  const resolvedTheme = resolveThemeFromSources({
    manifest: props.manifest as any,
    theme: props.theme,
    useManifestTheme: props.useManifestTheme,
    preferManifestStyle: props.preferManifestStyle,
  });
  const resolvedOptions = {
    ...resolvedTheme.delft.slideshow,
    ...(props.options || {}),
  };
  const {
    alternativeImageMode = true,
    transitionScale = false,
    imageInfoIcon = false,
    coverImages = false,
    ignoreCanvasBackgrounds = false,
  } = resolvedOptions;

  const vault = useExistingVault();
  const [emblaRef, emblaApi] = useEmblaCarousel();
  const enabled = true;

  if (props.manifest?.id && !vault.requestStatus(props.manifest.id)) {
    vault.loadSync(props.manifest.id, JSON.parse(JSON.stringify(props.manifest)));
  }

  const firstItem = props.manifest.items?.[0];
  const firstCanvas = firstItem ? vault.get<any>(firstItem) : null;
  const firstCanvasIsSplash = firstCanvas?.behavior?.includes("splash");
  const selectedSplashCanvas = !!props.canvasId && firstCanvas?.id === props.canvasId && firstCanvasIsSplash;
  const showSplashSlide = firstCanvasIsSplash && (!props.canvasId || selectedSplashCanvas);
  const canvasItems = firstCanvasIsSplash ? (props.manifest.items || []).slice(1) : props.manifest.items || [];
  const invertSplash = firstCanvas?.behavior?.includes("invert");
  const splashBackground = typeof firstCanvas?.backgroundColor === "string" ? firstCanvas.backgroundColor : null;

  const scrollPrev = usePress({
    onPress: () => {
      if (emblaApi) emblaApi.scrollPrev();
    },
  });

  const scrollNext = usePress({
    onPress: () => {
      if (emblaApi) emblaApi.scrollNext();
    },
  });

  return (
    <VaultProvider vault={vault}>
      <div className="exhibition-viewer flex flex-col h-full w-full min-h-0" style={getThemeCssVariables(resolvedTheme)}>
        <div className="overflow-hidden bg-black relative flex-1" ref={emblaRef}>
          <div className="flex h-full">
            {showSplashSlide ? (
              <div
                className={`exhibition-slideshow-slide exv-scroll-title-splash relative items-center justify-center overflow-hidden p-6 text-center sm:p-10 ${invertSplash ? "text-white" : "text-black"}`}
                style={splashBackground ? ({ "--exv-scroll-splash-overlay": splashBackground } as CSSProperties) : undefined}
              >
                <div className="absolute inset-0 z-0">
                  <AtlasStoreProvider name={`${firstCanvas.id}-slideshow-splash`}>
                    <CanvasPreviewBlock canvasId={firstCanvas.id} cover disablePopup index={0} showCaption={false} />
                  </AtlasStoreProvider>
                </div>
                <div
                  className={`relative z-20 flex w-full max-w-3xl flex-col gap-6 p-6 sm:p-8 ${splashBackground ? "" : `backdrop-blur-md ${invertSplash ? "bg-black/25" : "bg-white/25"}`}`}
                >
                  <p className="text-xs uppercase tracking-[0.4em] opacity-60">
                    {props.content?.exhibition || "Exhibition"}
                  </p>
                  <h1 className="text-3xl font-semibold sm:text-4xl">
                    <LocaleString>{props.manifest.label}</LocaleString>
                  </h1>
                  {props.manifest.summary ? (
                    <LocaleString as="div" enableDangerouslySetInnerHTML className="text-lg leading-relaxed opacity-75">
                      {props.manifest.summary}
                    </LocaleString>
                  ) : null}
                  {props.manifest.requiredStatement ? (
                    <div className="text-sm opacity-75">
                      <div className="font-semibold">
                        <LocaleString>{props.manifest.requiredStatement.label}</LocaleString>
                      </div>
                      <LocaleString>{props.manifest.requiredStatement.value}</LocaleString>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            {!selectedSplashCanvas ? (
              <MapCanvasStrategy onlyCanvasId={props.canvasId} items={canvasItems}>
                {{
                  // When its images.
                  images: ({ index, canvas }) => {
                    const foundLinks = (props.viewObjectLinks || []).filter((link) => link.canvasId === canvas.id);

                    return (
                      <div className="exhibition-slideshow-slide">
                        <ImageBlock
                          key={index}
                          scrollEnabled={!enabled}
                          canvas={canvas}
                          index={index}
                          fullWidthGrid
                          coverImages={coverImages}
                          objectLinks={foundLinks}
                          alternativeMode={alternativeImageMode}
                          transitionScale={transitionScale}
                          imageInfoIcon={imageInfoIcon}
                          ignoreCanvasBackgrounds={ignoreCanvasBackgrounds}
                        />
                      </div>
                    );
                  },

                  // Textual content
                  "textual-content": ({ index, canvas, strategy }) => (
                    <div className="exhibition-slideshow-slide">
                      <InfoBlock
                        // scrollEnabled={!enabled}
                        index={index}
                        // firstInfo={fullTitleBar && index === 1}
                        canvas={canvas}
                        strategy={strategy}
                      />
                    </div>
                  ),

                  // Media content
                  media: ({ index, canvas, strategy }) => (
                    <Suspense key={index} fallback={<div className={"cut-corners bg-black text-white"} />}>
                      <MediaBlock
                        key={index}
                        scrollEnabled={!enabled}
                        canvas={canvas}
                        fullWidthGrid
                        strategy={strategy}
                        index={index}
                      />
                    </Suspense>
                  ),
                }}
              </MapCanvasStrategy>
            ) : null}
          </div>
        </div>
        <div className="bg-ControlBar items-center text-TextPrimary py-2 px-6 flex gap-4">
          <div className="flex-1 text-lg font-mono">
            <LocaleString>{props.manifest.label}</LocaleString>
          </div>
          <button
            className="z-50 flex h-10 w-10 items-center justify-center rounded hover:bg-black/10"
            {...scrollPrev.pressProps}
          >
            <PreviousIcon className="text-2xl" />
          </button>
          <button
            className="z-50 flex h-10 w-10 items-center justify-center rounded hover:bg-black/10"
            {...scrollNext.pressProps}
          >
            <NextIcon className="text-2xl" />
          </button>
        </div>
      </div>
    </VaultProvider>
  );
}

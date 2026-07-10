import type { Manifest } from "@iiif/presentation-3";
import type { Vault } from "@iiif/helpers/vault";
import { useRef } from "react";
import { useExistingVault, useManifest, useVaultSelector } from "react-iiif-vault";
import { Provider } from "./components/Provider";
import { ScrollImageBlock } from "./components/scroll/ScrollImageBlock";
import { ScrollInfoBlock } from "./components/scroll/ScrollInfoBlock";
import { ScrollMediaBlock } from "./components/scroll/ScrollMediaBlock";
import { ScrollCompactDeckBlock } from "./components/scroll/ScrollCompactDeckBlock";
import { ScrollProgressBar } from "./components/scroll/ScrollProgressBar";
import { ScrollToTopButton } from "./components/scroll/ScrollToTopButton";
import { ScrollImageDetailsBlock } from "./components/scroll/ScrollImageDetailsBlock";
import { ScrollTitleBlock } from "./components/scroll/ScrollTitleBlock";
import { ScrollTourBlock } from "./components/scroll/ScrollTourBlock";
import { SectionNavigationControls } from "./components/shared/SectionNavigationControls";
import { MapCanvasStrategy } from "./helpers/MapCanvasStrategy";
import type { ObjectLink } from "./helpers/object-links";
import { type ScrollThemeOptions, ScrollThemeProvider } from "./theme/scroll-theme";
import {
  type DeepPartial,
  type ExhibitionThemeConfig,
  getThemeCssVariables,
  mergeDefined,
  resolveThemeFromSources,
} from "./theme/exhibition-theme";

export type ScrollExhibitionProps = {
  manifest: Manifest | string;
  canvasId?: string;
  language?: string;
  skipLoadManifest?: boolean;
  viewObjectLinks?: Array<ObjectLink>;
  showTitleBlock?: boolean;
  showTableOfContents?: boolean;
  options?: ScrollThemeOptions;
  theme?: DeepPartial<ExhibitionThemeConfig>;
  useManifestTheme?: boolean;
  preferManifestStyle?: boolean;
  customVault?: Vault;
};

export function ScrollExhibition(props: ScrollExhibitionProps) {
  return (
    <Provider
      customVault={props.customVault}
      language={props.language}
      manifest={props.manifest}
      skipLoadManifest={props.skipLoadManifest}
    >
      <ScrollExhibitionContents
        canvasId={props.canvasId}
        viewObjectLinks={props.viewObjectLinks}
        showTitleBlock={props.showTitleBlock}
        showTableOfContents={props.showTableOfContents}
        options={props.options}
        theme={props.theme}
        useManifestTheme={props.useManifestTheme}
        preferManifestStyle={props.preferManifestStyle}
      />
    </Provider>
  );
}

function ScrollExhibitionContents({
  canvasId,
  viewObjectLinks,
  showTitleBlock,
  showTableOfContents,
  options,
  theme,
  useManifestTheme,
  preferManifestStyle,
}: {
  canvasId?: string;
  viewObjectLinks?: Array<ObjectLink>;
  showTitleBlock?: boolean;
  showTableOfContents?: boolean;
  options?: ScrollThemeOptions;
  theme?: DeepPartial<ExhibitionThemeConfig>;
  useManifestTheme?: boolean;
  preferManifestStyle?: boolean;
}) {
  const manifest = useManifest();
  const vault = useExistingVault();
  const firstItem = manifest?.items?.[0];
  const firstCanvas = useVaultSelector((_, vault) => (firstItem ? vault.get(firstItem) : null), [firstItem]);

  if (!manifest) return null;

  const resolvedTheme = resolveThemeFromSources({
    manifest: manifest as any,
    theme,
    useManifestTheme,
    preferManifestStyle,
    resolveService: (service) => vault.get(service),
  });
  const resolvedOptions = mergeDefined(resolvedTheme.scroll.options, {
    ...options,
    titleBlock: {
      ...mergeDefined(resolvedTheme.scroll.options.titleBlock, options?.titleBlock),
    },
  });
  const resolvedShowTitleBlock = showTitleBlock ?? resolvedOptions.showTitleBlock;
  const resolvedShowTableOfContents = showTableOfContents ?? resolvedOptions.showTableOfContents;
  const resolvedShowProgressBar = resolvedOptions.showProgressBar ?? true;
  const resolvedShowProgressTableOfContents = resolvedOptions.showProgressTableOfContents ?? true;
  const resolvedShowScrollToTop = resolvedOptions.showScrollToTop ?? true;
  const resolvedShowNavigationControls = resolvedOptions.showNavigationControls ?? true;
  const firstCanvasIsSplash = firstCanvas?.behavior?.includes("splash");
  const selectedSplashCanvas = !!canvasId && firstCanvas?.id === canvasId && firstCanvasIsSplash;
  const showInitialPanel = resolvedShowTitleBlock || selectedSplashCanvas;
  const canvasItems = firstCanvasIsSplash ? (manifest.items || []).slice(1) : manifest.items || [];
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <ScrollThemeProvider options={resolvedOptions}>
      <div ref={containerRef} className="exv-scroll w-full min-h-screen" style={getThemeCssVariables(resolvedTheme)}>
        {resolvedShowProgressBar ? (
          <ScrollProgressBar
            containerRef={containerRef}
            enabledCanvasId={canvasId}
            showTableOfContents={resolvedShowProgressTableOfContents}
          />
        ) : null}
        {resolvedShowScrollToTop ? <ScrollToTopButton containerRef={containerRef} /> : null}
        {resolvedShowNavigationControls ? <SectionNavigationControls containerRef={containerRef} /> : null}
        {showInitialPanel ? (
          <ScrollTitleBlock
            manifest={manifest}
            index={0}
            showTableOfContents={resolvedShowTableOfContents}
            options={resolvedOptions}
          />
        ) : null}
        {!selectedSplashCanvas ? (
          <MapCanvasStrategy
            onlyCanvasId={canvasId}
            items={canvasItems}
            themeProvider={ScrollThemeProvider}
            themeOptions={resolvedOptions}
          >
            {{
              images: ({ index, canvas, strategy }) => {
                const foundLinks = (viewObjectLinks || []).filter((link) => link.canvasId === canvas.id);

                if (canvas.behavior?.includes("image-details")) {
                  return (
                    <ScrollImageDetailsBlock
                      key={canvas.id}
                      id={`s${index}`}
                      canvas={canvas}
                      index={index + 1}
                      objectLinks={foundLinks}
                    />
                  );
                }

                if (canvas.behavior?.includes("compact-deck")) {
                  return (
                    <ScrollCompactDeckBlock
                      key={canvas.id}
                      id={`s${index}`}
                      canvas={canvas}
                      index={index + 1}
                      objectLinks={foundLinks}
                    />
                  );
                }

                if (canvas.annotations.length) {
                  return (
                    <ScrollTourBlock
                      key={canvas.id}
                      id={`s${index}`}
                      canvas={canvas}
                      index={index + 1}
                      objectLinks={foundLinks}
                    />
                  );
                }

                return (
                  <ScrollImageBlock
                    id={`s${index}`}
                    key={canvas.id}
                    canvas={canvas}
                    index={index + 1}
                    scrollEnabled
                    objectLinks={foundLinks}
                  />
                );
              },
              "textual-content": ({ index, canvas, strategy }) => (
                <ScrollInfoBlock id={`s${index}`} key={canvas.id} canvas={canvas} strategy={strategy} index={index + 1} scrollEnabled />
              ),
              media: ({ index, canvas, strategy }) => (
                <ScrollMediaBlock id={`s${index}`} key={canvas.id} canvas={canvas} strategy={strategy} index={index + 1} scrollEnabled />
              ),
            }}
          </MapCanvasStrategy>
        ) : null}
      </div>
    </ScrollThemeProvider>
  );
}

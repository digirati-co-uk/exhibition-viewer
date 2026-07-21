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
import { TableOfContentsBar } from "./components/shared/TableOfContentsBar";
import { TopIcon } from "./components/icons/TopIcon";
import { MapCanvasStrategy } from "./helpers/MapCanvasStrategy";
import type { ObjectLink } from "./helpers/object-links";
import { type ScrollThemeOptions, ScrollThemeProvider } from "./theme/scroll-theme";
import {
  type DeepPartial,
  type ExhibitionThemeConfig,
  getThemeClassName,
  getThemeCssVariables,
  mergeThemeInputs,
  resolveThemeFromSources,
} from "./theme/exhibition-theme";
import { getCanvasNavigationId } from "./helpers/canvas-navigation";

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
  const resolvedOptions = mergeThemeInputs(resolvedTheme.scroll.options, options) || resolvedTheme.scroll.options;
  const resolvedShowTitleBlock = showTitleBlock ?? resolvedOptions.showTitleBlock;
  const resolvedShowTableOfContents = showTableOfContents ?? resolvedOptions.showTableOfContents;
  const resolvedTableOfContentsPlacement = resolvedOptions.tableOfContentsPlacement ?? "header";
  const resolvedShowProgressBar = resolvedOptions.showProgressBar ?? true;
  const resolvedShowProgressTableOfContents =
    resolvedTableOfContentsPlacement === "header" && (resolvedOptions.showProgressTableOfContents ?? true);
  const resolvedShowScrollToTop = resolvedOptions.showScrollToTop ?? true;
  const resolvedShowNavigationControls = resolvedOptions.showNavigationControls ?? true;
  const firstCanvasIsSplash = firstCanvas?.behavior?.includes("splash");
  const selectedSplashCanvas = !!canvasId && firstCanvas?.id === canvasId && firstCanvasIsSplash;
  const showInitialPanel = resolvedShowTitleBlock || selectedSplashCanvas;
  const canvasItems = firstCanvasIsSplash ? (manifest.items || []).slice(1) : manifest.items || [];
  const canvasIndexOffset = firstCanvasIsSplash ? 1 : 0;
  const containerRef = useRef<HTMLDivElement>(null);
  const showHeaderTableOfContents = resolvedTableOfContentsPlacement === "header";
  const showFooterTableOfContents = resolvedTableOfContentsPlacement === "footer";
  const showTopBar = resolvedShowProgressBar || (showHeaderTableOfContents && resolvedShowProgressTableOfContents);

  return (
    <ScrollThemeProvider options={resolvedOptions}>
      <div id="top" ref={containerRef} className={`exv-scroll w-full min-h-screen ${getThemeClassName(resolvedTheme.preset)}`} style={getThemeCssVariables(resolvedTheme)}>
        {showTopBar ? (
          <ScrollProgressBar
            containerRef={containerRef}
            enabledCanvasId={canvasId}
            showProgress={resolvedShowProgressBar}
            showTableOfContents={showHeaderTableOfContents && resolvedShowProgressTableOfContents}
            showManifestDetails={false}
          />
        ) : null}
        {resolvedShowScrollToTop && !showFooterTableOfContents ? <ScrollToTopButton containerRef={containerRef} /> : null}
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
                const canvasIndex = index + canvasIndexOffset;
                const foundLinks = (viewObjectLinks || []).filter((link) => link.canvasId === canvas.id);

                if (canvas.behavior?.includes("image-details")) {
                  return (
                    <ScrollImageDetailsBlock
                      key={canvas.id}
                      id={getCanvasNavigationId(canvasIndex)}
                      canvas={canvas}
                      index={canvasIndex + 1}
                      objectLinks={foundLinks}
                    />
                  );
                }

                if (canvas.behavior?.includes("compact-deck")) {
                  return (
                    <ScrollCompactDeckBlock
                      key={canvas.id}
                      id={getCanvasNavigationId(canvasIndex)}
                      canvas={canvas}
                      index={canvasIndex + 1}
                      objectLinks={foundLinks}
                    />
                  );
                }

                if (canvas.annotations.length) {
                  return (
                    <ScrollTourBlock
                      key={canvas.id}
                      id={getCanvasNavigationId(canvasIndex)}
                      canvas={canvas}
                      index={canvasIndex + 1}
                      objectLinks={foundLinks}
                    />
                  );
                }

                return (
                  <ScrollImageBlock
                    id={getCanvasNavigationId(canvasIndex)}
                    key={canvas.id}
                    canvas={canvas}
                    index={canvasIndex + 1}
                    scrollEnabled
                    objectLinks={foundLinks}
                  />
                );
              },
              "textual-content": ({ index, canvas, strategy }) => (
                <ScrollInfoBlock id={getCanvasNavigationId(index + canvasIndexOffset)} key={canvas.id} canvas={canvas} strategy={strategy} index={index + canvasIndexOffset + 1} scrollEnabled />
              ),
              media: ({ index, canvas, strategy }) => (
                <ScrollMediaBlock id={getCanvasNavigationId(index + canvasIndexOffset)} key={canvas.id} canvas={canvas} strategy={strategy} index={index + canvasIndexOffset + 1} scrollEnabled />
              ),
            }}
          </MapCanvasStrategy>
        ) : null}
        {showFooterTableOfContents ? (
          <TableOfContentsBar
            fixed
            content={{
              tableOfContents: "Table of Contents",
            }}
            enabledCanvasId={canvasId}
          >
            <a
              aria-label={"Back to top"}
              className="z-50 hover:bg-black/10 w-10 h-10 rounded flex items-center justify-center"
              href="#top"
            >
              <TopIcon />
            </a>
          </TableOfContentsBar>
        ) : null}
      </div>
    </ScrollThemeProvider>
  );
}

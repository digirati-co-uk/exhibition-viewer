import type { Manifest } from "@iiif/presentation-3";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import type { Vault } from "@iiif/helpers/vault";
import { useRef } from "react";
import { LocaleString, useExistingVault, useManifest, useVaultSelector } from "react-iiif-vault";
import { Provider } from "./components/Provider";
import { BaseGridSection } from "./components/shared/BaseGridSection";
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
import { hasAnnotationItems } from "./helpers/canvas-pages";
import { getScrollBlockKind } from "./helpers/scroll-block-kind";
import { type ScrollContent, ScrollContentProvider, useScrollContent } from "./helpers/scroll-content";
import type { AudioThemeOptions } from "./helpers/audio";

export type ScrollExhibitionProps = {
  manifest: Manifest | string;
  canvasId?: string;
  language?: string;
  skipLoadManifest?: boolean;
  viewObjectLinks?: Array<ObjectLink>;
  showTitleBlock?: boolean;
  showTableOfContents?: boolean;
  /** Enable proximity snapping when the exhibition owns the document's scrolling. */
  snapAudio?: boolean;
  options?: ScrollThemeOptions;
  theme?: DeepPartial<ExhibitionThemeConfig>;
  /** Audio slide defaults, merged over `theme.audio` (canvas behaviors still win per slide). */
  audio?: Partial<AudioThemeOptions>;
  useManifestTheme?: boolean;
  preferManifestStyle?: boolean;
  customVault?: Vault;
  /** Override the text the scroll layout renders itself (labels, button names, placeholders). */
  content?: Partial<ScrollContent>;
  /**
   * Show a visible placeholder for canvases with nothing to render. Off by default so viewers never see one; the
   * manifest editor preview turns it on. Empty canvases keep an invisible anchor either way.
   */
  showEmptySections?: boolean;
};

export function ScrollExhibition(props: ScrollExhibitionProps) {
  return (
    <Provider
      customVault={props.customVault}
      language={props.language}
      manifest={props.manifest}
      skipLoadManifest={props.skipLoadManifest}
    >
      <ScrollContentProvider content={props.content}>
      <ScrollExhibitionContents
        canvasId={props.canvasId}
        viewObjectLinks={props.viewObjectLinks}
        showTitleBlock={props.showTitleBlock}
        showTableOfContents={props.showTableOfContents}
        snapAudio={props.snapAudio}
        options={props.options}
        theme={props.theme}
        audio={props.audio}
        useManifestTheme={props.useManifestTheme}
        preferManifestStyle={props.preferManifestStyle}
        showEmptySections={props.showEmptySections}
      />
      </ScrollContentProvider>
    </Provider>
  );
}

function ScrollExhibitionContents({
  canvasId,
  viewObjectLinks,
  showTitleBlock,
  showTableOfContents,
  snapAudio,
  options,
  theme,
  audio,
  useManifestTheme,
  preferManifestStyle,
  showEmptySections,
}: {
  canvasId?: string;
  viewObjectLinks?: Array<ObjectLink>;
  showTitleBlock?: boolean;
  showTableOfContents?: boolean;
  snapAudio?: boolean;
  options?: ScrollThemeOptions;
  theme?: DeepPartial<ExhibitionThemeConfig>;
  audio?: Partial<AudioThemeOptions>;
  useManifestTheme?: boolean;
  preferManifestStyle?: boolean;
  showEmptySections?: boolean;
}) {
  const content = useScrollContent();
  const manifest = useManifest();
  const vault = useExistingVault();
  const firstItem = manifest?.items?.[0];
  const firstCanvas = useVaultSelector((_, vault) => (firstItem ? vault.get(firstItem) : null), [firstItem]);

  const containerRef = useRef<HTMLDivElement>(null);
  if (!manifest) return null;

  const resolvedTheme = resolveThemeFromSources({
    manifest: manifest as any,
    theme,
    useManifestTheme,
    preferManifestStyle,
    resolveService: (service) => vault.get(service),
  });
  const resolvedOptions = mergeThemeInputs(resolvedTheme.scroll.options, options) || resolvedTheme.scroll.options;
  const resolvedShowTitleBlock = showTitleBlock ?? (!canvasId && resolvedOptions.showTitleBlock);
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
  const hiddenCoverId = firstCanvasIsSplash && !showInitialPanel ? firstCanvas?.id : undefined;
  const showHeaderTableOfContents = resolvedTableOfContentsPlacement === "header";
  const showFooterTableOfContents = resolvedTableOfContentsPlacement === "footer";
  const showTopBar = resolvedShowProgressBar || (showHeaderTableOfContents && resolvedShowProgressTableOfContents);

  return (
    <ScrollThemeProvider options={resolvedOptions}>
      <div
        id="top"
        ref={containerRef}
        data-snap-audio={snapAudio || undefined}
        className={`exv-scroll w-full min-h-[var(--exv-screen,100vh)] ${getThemeClassName(resolvedTheme.preset)}`}
        style={getThemeCssVariables(resolvedTheme)}
      >
        {showTopBar ? (
          <ScrollProgressBar
            containerRef={containerRef}
            enabledCanvasId={canvasId}
            excludedCanvasId={hiddenCoverId}
            showProgress={resolvedShowProgressBar}
            showTableOfContents={showHeaderTableOfContents && resolvedShowProgressTableOfContents}
            showManifestDetails={false}
          />
        ) : null}
        {resolvedShowScrollToTop && !showFooterTableOfContents ? (
          <ScrollToTopButton containerRef={containerRef} />
        ) : null}
        {resolvedShowNavigationControls ? <SectionNavigationControls containerRef={containerRef} scrollLayout /> : null}
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
          >
            {{
              images: ({ index, canvas }) => (
                <ScrollImageSection canvas={canvas} index={index + canvasIndexOffset}
                  objectLinks={viewObjectLinks?.filter((link) => link.canvasId === canvas.id)} />
              ),
              empty: ({ index, canvas }) => (
                <ScrollEmptySection
                  id={getCanvasNavigationId(index + canvasIndexOffset)}
                  label={canvas.label}
                  placeholder={showEmptySections ? content.emptySection : null}
                />
              ),
              "textual-content": ({ index, canvas, strategy }) => (
                <ScrollInfoBlock
                  id={getCanvasNavigationId(index + canvasIndexOffset)}
                  key={canvas.id}
                  canvas={canvas}
                  strategy={strategy}
                  index={index + canvasIndexOffset + 1}
                  scrollEnabled
                />
              ),
              media: ({ index, canvas, strategy }) => (
                <ScrollMediaBlock
                  id={getCanvasNavigationId(index + canvasIndexOffset)}
                  key={canvas.id}
                  canvas={canvas}
                  strategy={strategy}
                  index={index + canvasIndexOffset + 1}
                  scrollEnabled
                  audio={mergeThemeInputs(resolvedTheme.audio, audio) || resolvedTheme.audio}
                />
              ),
            }}
          </MapCanvasStrategy>
        ) : null}
        {showFooterTableOfContents ? (
          <TableOfContentsBar
            fixed
            instantNavigation
            content={{
              tableOfContents: content.tableOfContents,
            }}
            enabledCanvasId={canvasId}
            excludedCanvasId={hiddenCoverId}
          >
            {resolvedShowScrollToTop ? <a
              aria-label={content.backToTop}
              className="z-50 hover:bg-black/10 w-10 h-10 rounded flex items-center justify-center"
              href="#top"
            >
              <TopIcon />
            </a> : null}
          </TableOfContentsBar>
        ) : null}
      </div>
    </ScrollThemeProvider>
  );
}

function ScrollImageSection({ canvas, index, objectLinks }: {
  canvas: CanvasNormalized;
  index: number;
  objectLinks?: ObjectLink[];
}) {
  const hasAnnotations = useVaultSelector((_, vault) => hasAnnotationItems(vault, canvas), [canvas.annotations]);
  const props = { canvas, index: index + 1, id: getCanvasNavigationId(index), objectLinks };

  switch (getScrollBlockKind(canvas.behavior, hasAnnotations)) {
    case "image-details":
      return <ScrollImageDetailsBlock {...props} />;
    case "compact-deck":
      return <ScrollCompactDeckBlock {...props} />;
    case "tour":
      return <ScrollTourBlock {...props} />;
    default:
      return <ScrollImageBlock {...props} scrollEnabled />;
  }
}

/** Canvases with nothing to paint. Viewers get an invisible anchor so contents links and navigation still resolve. */
function ScrollEmptySection({ id, label, placeholder }: {
  id: string;
  label: CanvasNormalized["label"];
  placeholder: string | null;
}) {
  if (!placeholder) return <div id={id} data-step-id={id} aria-hidden="true" />;

  return (
    <BaseGridSection id={id} className="bg-InfoBlock px-6 py-12 text-InfoBlockText sm:px-10">
      <div className="mx-auto w-full max-w-4xl">
        <LocaleString as="h2" className="text-xl font-semibold">{label}</LocaleString>
        <p className="mt-2 opacity-75">{placeholder}</p>
      </div>
    </BaseGridSection>
  );
}

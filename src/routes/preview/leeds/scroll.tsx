import { fetchManifest } from "@/helpers/fetch-manifest";
import { createFileRoute } from "@tanstack/react-router";
import { ScrollExhibition } from "@/delft";
import { getThemeClassName } from "@/theme/exhibition-theme";
import { ManifestEditorScrollPreview } from "../scroll";
import { type PreviewSearchInput, scrollPreviewSearch } from "../-search";

const DEFAULT_MANIFEST =
  "https://leedsunilibrary.exhibitionviewer.org/iiif/marie-hartley.json";

export const Route = createFileRoute("/preview/leeds/scroll")({
  component: RouteComponent,
  validateSearch: (search: PreviewSearchInput) => scrollPreviewSearch(search, DEFAULT_MANIFEST, "leeds-brown"),
  loaderDeps: ({ search }) => ({
    manifest: search.manifest,
    manifestEditorPreview: search.manifestEditorPreview,
  }),
  staleTime: 0,
  loader: ({ deps }) =>
    deps.manifestEditorPreview ? null : fetchManifest(deps.manifest),
});

function RouteComponent() {
  const search = Route.useSearch();
  const manifest = Route.useLoaderData();
  const options = {
    ignoreCanvasBackgrounds: search.ignoreCanvasBackgrounds,
    showProgressBar: search.showProgressBar,
    showProgressTableOfContents: search.showProgressTableOfContents,
    showScrollToTop: search.showScrollToTop,
    showNavigationControls: search.showNavigationControls,
    tourCaptionClearance: search.tourCaptionClearance,
    tableOfContentsPlacement: search.tableOfContentsPlacement,
  };

  if (search.manifestEditorPreview) {
    return (
      <ManifestEditorScrollPreview
        minimal={false}
        origin={search.manifestEditorPreviewOrigin}
        showTitleBlock={search.showTitleBlock}
        showTableOfContents={search.showTableOfContents}
        themePreset={search.themePreset}
        {...options}
      />
    );
  }

  return (
    <div
      className={`relative flex min-h-screen w-full flex-col items-center ${getThemeClassName(search.themePreset)}`}
      data-cut-corners-enabled="false"
    >
      <ScrollExhibition
        manifest={manifest!}
        preferManifestStyle
        snapAudio
        canvasId={search.canvas}
        language="en"
        viewObjectLinks={[]}
        showTitleBlock={search.showTitleBlock}
        showTableOfContents={search.showTableOfContents}
        options={options}
        theme={{ preset: search.themePreset }}
      />
    </div>
  );
}

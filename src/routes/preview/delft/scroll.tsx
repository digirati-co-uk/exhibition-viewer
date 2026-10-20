import { fetchManifest } from "@/helpers/fetch-manifest";
import { createFileRoute } from "@tanstack/react-router";
import { ScrollExhibition } from "@/delft";
import { getThemeClassName, normalizeThemePreset } from "@/theme/exhibition-theme";
import { ManifestEditorScrollPreview } from "../scroll";
import { type PreviewSearchInput, optionalBoolean, searchParam, tableOfContentsPlacement } from "../-search";

const DEFAULT_MANIFEST = "/scroll-leeds.json";

export const Route = createFileRoute("/preview/delft/scroll")({
  component: RouteComponent,
  validateSearch: (search: PreviewSearchInput) => {
    const placement = searchParam(
      search,
      "toc-placement",
      "tableOfContentsPlacement",
    );
    return {
      manifestEditorPreview:
        optionalBoolean(
          searchParam(search, "manifest-editor-preview", "manifestEditorPreview"),
        ) ?? false,
      manifestEditorPreviewOrigin: searchParam(
        search,
        "manifest-editor-preview-origin",
        "manifestEditorPreviewOrigin",
      ) as string | undefined,
      manifest: (search.manifest as string) || DEFAULT_MANIFEST,
      themePreset: normalizeThemePreset(search.theme || search.preset || "delft"),
      canvas: search.canvas as string | undefined,
      ignoreCanvasBackgrounds: optionalBoolean(
        searchParam(
          search,
          "ignore-canvas-backgrounds",
          "ignoreCanvasBackgrounds",
        ),
      ),
      showTitleBlock: optionalBoolean(
        searchParam(search, "show-title-block", "showTitleBlock"),
      ),
      showTableOfContents: optionalBoolean(
        searchParam(search, "show-table-of-contents", "showTableOfContents"),
      ),
      showProgressBar: optionalBoolean(
        searchParam(search, "show-progress-bar", "showProgressBar"),
      ),
      showProgressTableOfContents: optionalBoolean(
        searchParam(
          search,
          "show-progress-table-of-contents",
          "showProgressTableOfContents",
        ),
      ),
      showScrollToTop: optionalBoolean(
        searchParam(search, "show-scroll-to-top", "showScrollToTop"),
      ),
      showNavigationControls: optionalBoolean(
        searchParam(search, "show-navigation-controls", "showNavigationControls"),
      ),
      tableOfContentsPlacement: tableOfContentsPlacement(placement),
    };
  },
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

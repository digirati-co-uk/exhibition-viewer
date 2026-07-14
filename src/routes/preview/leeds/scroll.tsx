import { fetch } from "@iiif/helpers";
import { createFileRoute } from "@tanstack/react-router";
import { ScrollExhibition } from "@/delft";
import { getThemeClassName, normalizeThemePreset } from "@/theme/exhibition-theme";
import { ManifestEditorScrollPreview } from "../scroll";

const DEFAULT_MANIFEST =
  "https://leedsunilibrary.exhibitionviewer.org/iiif/marie-hartley.json";

function optionalBoolean(value: unknown) {
  return value === "true" || value === true
    ? true
    : value === "false" || value === false
      ? false
      : undefined;
}

function value(search: Record<string, unknown>, kebab: string, camel: string) {
  return search[kebab] ?? search[camel];
}

export const Route = createFileRoute("/preview/leeds/scroll")({
  component: RouteComponent,
  validateSearch: (search) => {
    const placement = value(
      search,
      "toc-placement",
      "tableOfContentsPlacement",
    );
    return {
      manifestEditorPreview:
        optionalBoolean(
          value(search, "manifest-editor-preview", "manifestEditorPreview"),
        ) ?? false,
      manifestEditorPreviewOrigin: value(
        search,
        "manifest-editor-preview-origin",
        "manifestEditorPreviewOrigin",
      ) as string | undefined,
      manifest: (search.manifest as string) || DEFAULT_MANIFEST,
      themePreset: normalizeThemePreset(
        search.theme || search.preset || "leeds-brown",
      ),
      canvas: search.canvas as string | undefined,
      ignoreCanvasBackgrounds: optionalBoolean(
        value(
          search,
          "ignore-canvas-backgrounds",
          "ignoreCanvasBackgrounds",
        ),
      ),
      showTitleBlock: optionalBoolean(
        value(search, "show-title-block", "showTitleBlock"),
      ),
      showTableOfContents: optionalBoolean(
        value(search, "show-table-of-contents", "showTableOfContents"),
      ),
      showProgressBar: optionalBoolean(
        value(search, "show-progress-bar", "showProgressBar"),
      ),
      showProgressTableOfContents: optionalBoolean(
        value(
          search,
          "show-progress-table-of-contents",
          "showProgressTableOfContents",
        ),
      ),
      showScrollToTop: optionalBoolean(
        value(search, "show-scroll-to-top", "showScrollToTop"),
      ),
      showNavigationControls: optionalBoolean(
        value(search, "show-navigation-controls", "showNavigationControls"),
      ),
      tableOfContentsPlacement:
        placement === "header" || placement === "footer" || placement === "none"
          ? placement
          : undefined,
    };
  },
  loaderDeps: ({ search }) => ({
    manifest: search.manifest,
    manifestEditorPreview: search.manifestEditorPreview,
  }),
  staleTime: 0,
  loader: ({ deps }) =>
    deps.manifestEditorPreview ? null : fetch(deps.manifest),
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
        showTableOfContents={search.showTableOfContents || false}
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

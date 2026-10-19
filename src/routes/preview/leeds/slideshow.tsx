import { fetchManifest } from "@/helpers/fetch-manifest";
import { createFileRoute } from "@tanstack/react-router";
import { DelftPresentation } from "@/delft";
import { getThemeClassName, normalizeThemePreset } from "@/theme/exhibition-theme";
import { ManifestEditorSlideshowPreview } from "../slideshow";
import { type PreviewSearchInput, floatingPosition, optionalBoolean, searchParam } from "../-search";

const DEFAULT_MANIFEST = "/slideshow.json";

export const Route = createFileRoute("/preview/leeds/slideshow")({
  component: RouteComponent,
  validateSearch: (search: PreviewSearchInput) => ({
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
    themePreset: normalizeThemePreset(
      search.theme || search.preset || "leeds-brown",
    ),
    canvas: search.canvas as string | undefined,
    cutCorners: optionalBoolean(searchParam(search, "cut-corners", "cutCorners")),
    floating: optionalBoolean(searchParam(search, "floating", "isFloating")),
    floatingPosition: floatingPosition(
      searchParam(search, "floating-position", "floatingPosition"),
    ),
    labelOnlyFloating: optionalBoolean(
      searchParam(search, "label-only-floating", "labelOnlyFloating"),
    ),
    ignoreCanvasBackgrounds: optionalBoolean(
      searchParam(
        search,
        "ignore-canvas-backgrounds",
        "ignoreCanvasBackgrounds",
      ),
    ),
  }),
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
    cutCorners: search.cutCorners,
    isFloating: search.floating,
    floatingPosition: search.floatingPosition,
    labelOnlyFloating: search.labelOnlyFloating,
    ignoreCanvasBackgrounds: search.ignoreCanvasBackgrounds,
  };

  if (search.manifestEditorPreview) {
    return (
      <ManifestEditorSlideshowPreview
        minimal={false}
        origin={search.manifestEditorPreviewOrigin}
        themePreset={search.themePreset}
        cutCorners={options.cutCorners}
        floating={options.isFloating}
        floatingPosition={options.floatingPosition}
        labelOnlyFloating={options.labelOnlyFloating}
        ignoreCanvasBackgrounds={options.ignoreCanvasBackgrounds}
      />
    );
  }

  return (
    <div
      className={`flex h-screen min-h-0 w-full flex-col overflow-hidden ${getThemeClassName(search.themePreset)}`}
      data-cut-corners-enabled="false"
    >
      <DelftPresentation
        manifest={manifest!}
        canvasId={search.canvas}
        language="en"
        viewObjectLinks={[]}
        options={options}
        theme={{ preset: search.themePreset }}
      />
    </div>
  );
}

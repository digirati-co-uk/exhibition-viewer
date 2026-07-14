import { fetch } from "@iiif/helpers";
import { createFileRoute } from "@tanstack/react-router";
import { DelftPresentation } from "@/delft";
import type { FloatingPosition } from "@/theme/exhibition-theme";
import { ManifestEditorSlideshowPreview } from "../slideshow";

const DEFAULT_MANIFEST =
  "https://heritage.tudelft.nl/iiif/manifests/gen-ai/manifest.json";

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

function floatingPosition(value: unknown): FloatingPosition | undefined {
  return value === "top-left" ||
    value === "top-right" ||
    value === "bottom-left" ||
    value === "bottom-right" ||
    value === "top" ||
    value === "bottom" ||
    value === "left" ||
    value === "right"
    ? value
    : undefined;
}

export const Route = createFileRoute("/preview/delft/slideshow")({
  component: RouteComponent,
  validateSearch: (search) => ({
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
    canvas: search.canvas as string | undefined,
    cutCorners: optionalBoolean(value(search, "cut-corners", "cutCorners")),
    floating: optionalBoolean(value(search, "floating", "isFloating")),
    floatingPosition: floatingPosition(
      value(search, "floating-position", "floatingPosition"),
    ),
    labelOnlyFloating: optionalBoolean(
      value(search, "label-only-floating", "labelOnlyFloating"),
    ),
    ignoreCanvasBackgrounds: optionalBoolean(
      value(
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
    deps.manifestEditorPreview ? null : fetch(deps.manifest),
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
        themePreset="delft"
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
      className="delft-exhibition flex h-screen min-h-0 w-full flex-col overflow-hidden bg-white"
      data-cut-corners-enabled="false"
    >
      <DelftPresentation
        manifest={manifest!}
        canvasId={search.canvas}
        language="en"
        viewObjectLinks={[]}
        options={options}
        theme={{ preset: "delft" }}
      />
    </div>
  );
}

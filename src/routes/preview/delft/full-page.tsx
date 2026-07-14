import { fetch } from "@iiif/helpers";
import { createFileRoute } from "@tanstack/react-router";
import { DelftExhibition, type DelftExhibitionProps } from "@/delft";
import { getThemeClassName, normalizeThemePreset } from "@/theme/exhibition-theme";
import { ManifestEditorExhibitionPreview } from "../exhibition";

const DEFAULT_MANIFEST =
  "https://heritage.tudelft.nl/iiif/manifests/novieten/manifest.json";

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

export const Route = createFileRoute("/preview/delft/full-page")({
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
    themePreset: normalizeThemePreset(search.theme || search.preset || "delft"),
    canvas: search.canvas as string | undefined,
    cutCorners: optionalBoolean(value(search, "cut-corners", "cutCorners")),
    fullTitleBar: optionalBoolean(
      value(search, "full-title-bar", "fullTitleBar"),
    ),
    showProgressBar: optionalBoolean(
      value(search, "show-progress-bar", "showProgressBar"),
    ),
    tableOfContentsPlacement:
      value(search, "toc-placement", "tableOfContentsPlacement") === "header"
        ? "header" as const
        : value(search, "toc-placement", "tableOfContentsPlacement") ===
            "footer" as const
          ? "footer" as const
          : undefined,
    disablePresentation: optionalBoolean(
      value(
        search,
        "disable-presentation",
        "disablePresentation",
      ),
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
  const manifest = Route.useLoaderData() as DelftExhibitionProps['manifest'];

  if (search.manifestEditorPreview) {
    return (
      <ManifestEditorExhibitionPreview
        origin={search.manifestEditorPreviewOrigin}
        cutCorners={search.cutCorners}
        fullTitleBar={true}
        showProgressBar={search.showProgressBar}
        tableOfContentsPlacement={search.tableOfContentsPlacement}
        ignoreCanvasBackgrounds={search.ignoreCanvasBackgrounds}
        disablePresentation={search.disablePresentation}
        themePreset={search.themePreset}
        ExhibitionComponent={DelftExhibition}
      />
    );
  }

  return (
    <div
      className={`flex w-full flex-col items-center ${getThemeClassName(search.themePreset)}`}
      data-cut-corners-enabled="false"
    >
      <div className="min-h-[90vh] w-full max-w-screen-xl px-5 py-10 lg:px-10">
        <div className="flex h-full w-full flex-col items-center">
          <DelftExhibition
            manifest={manifest!}
            canvasId={search.canvas}
            language="en"
            viewObjectLinks={[]}
            options={{
              cutCorners: search.cutCorners,
              // fullTitleBar: search.fullTitleBar,
              fullTitleBar: true,
              showProgressBar: search.showProgressBar,
              tableOfContentsPlacement: search.tableOfContentsPlacement,
              ignoreCanvasBackgrounds: search.ignoreCanvasBackgrounds,
              disablePresentation: search.disablePresentation,
            }}
            theme={{ preset: search.themePreset }}
          />
        </div>
      </div>
    </div>
  );
}

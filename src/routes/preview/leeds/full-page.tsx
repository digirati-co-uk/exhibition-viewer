import { fetch } from "@iiif/helpers";
import { createFileRoute } from "@tanstack/react-router";
import { LeedsFullPageExhibition } from "@/leeds";
import { ManifestEditorExhibitionPreview } from "../exhibition";

export const Route = createFileRoute("/preview/leeds/full-page")({
  component: RouteComponent,
  validateSearch: (search) => ({
    manifestEditorPreview:
      search["manifest-editor-preview"] === "true" ||
      search["manifest-editor-preview"] === true,
    manifestEditorPreviewOrigin: search["manifest-editor-preview-origin"] as
      | string
      | undefined,
    // Default Leeds manifest: https://leedsunilibrary.exhibitionviewer.org/iiif/marie-hartley.json
    manifest:
      (search.manifest as string) ||
      "https://leedsunilibrary.exhibitionviewer.org/iiif/marie-hartley.json",
  }),
  loaderDeps: ({ search }) => ({
    manifest: search.manifest as string,
    manifestEditorPreview: search.manifestEditorPreview,
  }),
  staleTime: 0,
  loader: ({ deps }) =>
    deps.manifestEditorPreview ? null : fetch(deps.manifest),
});

function RouteComponent() {
  const search = Route.useSearch();
  const manifest = Route.useLoaderData();

  if (search.manifestEditorPreview) {
    return (
      <ManifestEditorExhibitionPreview
        origin={search.manifestEditorPreviewOrigin}
        themePreset="leeds-full-page"
        ExhibitionComponent={LeedsFullPageExhibition}
      />
    );
  }

  return (
    <div
      className="flex w-full flex-col items-center bg-black"
      data-cut-corners-enabled="false"
    >
      <div className="min-h-[90vh] w-full max-w-screen-xl px-5 py-10 lg:px-10">
        <div className="delft-exhibition flex h-full w-full flex-col items-center">
          <LeedsFullPageExhibition
            manifest={manifest}
            language="en"
            viewObjectLinks={[]}
          />
        </div>
      </div>
    </div>
  );
}

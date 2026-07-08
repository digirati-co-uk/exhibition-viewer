import { createFileRoute } from "@tanstack/react-router";
import { DelftExhibition } from "../../library";
import { fetch } from "@iiif/helpers";
import type { ExhibitionThemeConfig } from "@/theme/exhibition-theme";

export const Route = createFileRoute("/preview/minimal")({
  component: RouteComponent,
  validateSearch: (search) => {
    return {
      manifest:
        search.manifest ||
        "https://heritage.tudelft.nl/iiif/manifests/irrigation-knowledge/manifest.json",
      ignoreCanvasBackgrounds: search["ignore-canvas-backgrounds"] === "true" || search["ignore-canvas-backgrounds"] === true,
    };
  },

  loaderDeps: (opts) => {
    return {
      manifest: opts.search.manifest as string,
    };
  },

  staleTime: 0,

  loader: async ({ deps }) => {
    return fetch(
      // "https://heritage.tudelft.nl/iiif/manifests/irrigation-knowledge/manifest.json",
      deps.manifest,
    );
  },
});

function RouteComponent() {
  const search = Route.useSearch();

  if (!search.manifest) {
    return <div>No manifest</div>;
  }

  const manifest = Route.useLoaderData();
  return (
    <>
      <div
        className="flex w-full flex-col items-center bg-white minimal-theme"
        data-cut-corners-enabled="false"
      >
        <div className="min-h-[90vh] w-full max-w-screen-xl px-5 py-10 lg:px-10">
          <div className="flex w-full flex-col items-center h-full delft-exhibition">
            <DelftExhibition
              manifest={manifest}
              language="en"
              theme={{ preset: "minimal" } satisfies Partial<ExhibitionThemeConfig>}
              viewObjectLinks={[]}
              options={{ fullTitleBar: true, ignoreCanvasBackgrounds: search.ignoreCanvasBackgrounds }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { DelftExhibition } from "../../library";

export const Route = createFileRoute("/preview/minimal")({
  component: RouteComponent,
  validateSearch: (search) => {
    return {
      manifest:
        search.manifest ||
        "https://heritage.tudelft.nl/iiif/manifests/irrigation-knowledge/manifest.json",
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
    ).then((r) => r.json());
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
              viewObjectLinks={[]}
              options={{ fullTitleBar: true }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

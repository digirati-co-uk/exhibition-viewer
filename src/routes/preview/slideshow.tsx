import { createFileRoute } from "@tanstack/react-router";
import { DelftPresentation } from "exhibition-viewer";
import { fetch } from "@iiif/helpers";


export const Route = createFileRoute("/preview/slideshow")({
  component: RouteComponent,
  validateSearch: (search) => {
    return {
      minimal: search.minimal,
      floating: search.floating,
      floatingPosition: search.floatingPosition,
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
        className={`flex w-full flex-col h-[calc(100vh-4rem)] relative items-center bg-white ${search.minimal ? "minimal-theme" : "delft-exhibition"}`}
        data-cut-corners-enabled="false"
      >
        <DelftPresentation
          manifest={manifest}
          language="en"
          viewObjectLinks={[]}
          options={{
            isFloating: search.floating as any,
            floatingPosition: search.floatingPosition as any,
          }}
        />
      </div>
    </>
  );
}

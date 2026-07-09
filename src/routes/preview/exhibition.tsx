import { createFileRoute } from "@tanstack/react-router";
import { DelftExhibition } from "../../library";
import { fetch } from "@iiif/helpers";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MANIFEST_EDITOR_PREVIEW_CONNECT,
  MANIFEST_EDITOR_PREVIEW_READY,
  MANIFEST_EDITOR_PREVIEW_SELECTION,
  ManifestEditorMessagePortVault,
  type PreviewConnectionMessage,
} from "@/helpers/manifest-editor-preview";

function optionalBoolean(value: unknown) {
  return value === "true" || value === true ? true : value === "false" || value === false ? false : undefined;
}

export const Route = createFileRoute("/preview/exhibition")({
  component: RouteComponent,
  validateSearch: (search) => {
    return {
      manifestEditorPreview:
        search["manifest-editor-preview"] === "true" ||
        search["manifest-editor-preview"] === true,
      manifestEditorPreviewOrigin: search[
        "manifest-editor-preview-origin"
      ] as string | undefined,
      manifest:
        search.manifest ||
        "https://heritage.tudelft.nl/iiif/manifests/irrigation-knowledge/manifest.json",
      cutCorners: optionalBoolean(search["cut-corners"]),
      fullTitleBar: optionalBoolean(search["full-title-bar"]),
      tableOfContentsPlacement: search["toc-placement"] === "header" ? "header" : search["toc-placement"] === "footer" ? "footer" : undefined,
      ignoreCanvasBackgrounds: search["ignore-canvas-backgrounds"] === "true" || search["ignore-canvas-backgrounds"] === true,
    };
  },

  loaderDeps: (opts) => {
    return {
      manifest: opts.search.manifest as string,
      manifestEditorPreview: opts.search.manifestEditorPreview as boolean,
    };
  },

  staleTime: 0,

  loader: async ({ deps }) => {
    if (deps.manifestEditorPreview) {
      return null;
    }
    return fetch(deps.manifest);
  },
});

function RouteComponent() {
  const search = Route.useSearch();
  const manifest = Route.useLoaderData();

  if (search.manifestEditorPreview) {
    return (
      <ManifestEditorExhibitionPreview
        origin={search.manifestEditorPreviewOrigin}
        cutCorners={search.cutCorners}
        fullTitleBar={search.fullTitleBar}
        ignoreCanvasBackgrounds={search.ignoreCanvasBackgrounds}
      />
    );
  }

  if (!search.manifest) {
    return <div>No manifest</div>;
  }

  return (
    <>
      <div
        className="flex w-full flex-col items-center bg-white"
        data-cut-corners-enabled="false"
      >
        <div className="min-h-[90vh] w-full max-w-screen-xl px-5 py-10 lg:px-10">
          <div className="flex w-full flex-col items-center h-full delft-exhibition">
            <DelftExhibition
              manifest={manifest as any}
              language="en"
              viewObjectLinks={[]}
              options={{
                cutCorners: search.cutCorners,
                fullTitleBar: search.fullTitleBar,
                tableOfContentsPlacement: search.tableOfContentsPlacement,
                ignoreCanvasBackgrounds: search.ignoreCanvasBackgrounds,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function ManifestEditorExhibitionPreview({
  origin,
  cutCorners,
  fullTitleBar,
  ignoreCanvasBackgrounds,
}: {
  origin?: string;
  cutCorners?: boolean;
  fullTitleBar?: boolean;
  ignoreCanvasBackgrounds?: boolean;
}) {
  const [connection, setConnection] = useState<{
    vault: ManifestEditorMessagePortVault;
    resource: { id: string; type: string };
    canvasId: string | null;
  } | null>(null);
  const vaultRef = useRef<ManifestEditorMessagePortVault | null>(null);
  const allowedOrigin = useMemo(() => {
    const source = origin || document.referrer;
    return source ? new URL(source).origin : window.location.origin;
  }, [origin]);

  useEffect(() => {
    function handleWindowMessage(event: MessageEvent) {
      if (event.origin !== allowedOrigin) return;
      const data = event.data as PreviewConnectionMessage | any;
      if (!data || typeof data !== "object") return;

      if (data._type === MANIFEST_EDITOR_PREVIEW_CONNECT) {
        const port = event.ports[0];
        if (!port) return;
        const vault = new ManifestEditorMessagePortVault(port);
        vaultRef.current?.destroy();
        vaultRef.current = vault;
        void vault.waitUntilReady().then(() => {
          setConnection({
            vault,
            resource: data.resource,
            canvasId: data.canvasId || null,
          });
        });
      }

      if (data._type === MANIFEST_EDITOR_PREVIEW_SELECTION) {
        setConnection((current) =>
          current
            ? {
                ...current,
                resource: data.resource || current.resource,
                canvasId: data.canvasId || null,
              }
            : current,
        );
      }
    }

    window.addEventListener("message", handleWindowMessage);
    const target =
      window.parent !== window
        ? window.parent
        : window.opener && !window.opener.closed
          ? window.opener
          : null;
    target?.postMessage({ _type: MANIFEST_EDITOR_PREVIEW_READY }, allowedOrigin);

    return () => {
      window.removeEventListener("message", handleWindowMessage);
      vaultRef.current?.destroy();
      vaultRef.current = null;
    };
  }, [allowedOrigin]);

  if (!connection) {
    return (
      <main className="flex h-screen items-center justify-center bg-zinc-950 text-sm text-white/65">
        Waiting for manifest editor preview connection...
      </main>
    );
  }

  return (
    <div
      className="flex w-full flex-col items-center bg-white"
      data-cut-corners-enabled="false"
    >
      <div className="min-h-[90vh] w-full max-w-screen-xl px-5 py-10 lg:px-10">
        <div className="flex w-full flex-col items-center h-full delft-exhibition">
          <DelftExhibition
            key={connection.resource.id}
            manifest={connection.resource.id}
            canvasId={connection.canvasId || undefined}
            customVault={connection.vault as any}
            skipLoadManifest
            language="en"
            viewObjectLinks={[]}
            options={{ cutCorners, fullTitleBar, ignoreCanvasBackgrounds }}
          />
        </div>
      </div>
    </div>
  );
}

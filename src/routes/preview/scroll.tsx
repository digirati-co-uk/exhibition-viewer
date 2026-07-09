import { createFileRoute } from "@tanstack/react-router";
import { ScrollExhibition } from "../../library";
import { fetch } from "@iiif/helpers";
import type { ExhibitionThemeConfig } from "@/theme/exhibition-theme";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MANIFEST_EDITOR_PREVIEW_CONNECT,
  MANIFEST_EDITOR_PREVIEW_READY,
  MANIFEST_EDITOR_PREVIEW_SELECTION,
  ManifestEditorMessagePortVault,
  type PreviewConnectionMessage,
} from "@/helpers/manifest-editor-preview";

export const Route = createFileRoute("/preview/scroll")({
  component: RouteComponent,
  validateSearch: (search) => {
    return {
      minimal: search.minimal,
      manifestEditorPreview: search["manifest-editor-preview"] === "true" || search["manifest-editor-preview"] === true,
      manifestEditorPreviewOrigin: search["manifest-editor-preview-origin"] as string | undefined,
      ignoreCanvasBackgrounds: search["ignore-canvas-backgrounds"] === "true" || search["ignore-canvas-backgrounds"] === true,
      tableOfContentsPlacement: search["toc-placement"] === "footer" ? "footer" : search["toc-placement"] === "header" ? "header" : undefined,
      manifest:
        search.manifest ||
        "https://heritage.tudelft.nl/iiif/manifests/irrigation-knowledge/manifest.json",
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
    return fetch(
      // "https://heritage.tudelft.nl/iiif/manifests/irrigation-knowledge/manifest.json",
      deps.manifest,
    );
  },
});

function RouteComponent() {
  const search = Route.useSearch();
  const manifest = Route.useLoaderData();

  if (search.manifestEditorPreview) {
    return (
      <ManifestEditorScrollPreview
        minimal={!!search.minimal}
        origin={search.manifestEditorPreviewOrigin}
        ignoreCanvasBackgrounds={search.ignoreCanvasBackgrounds}
        tableOfContentsPlacement={search.tableOfContentsPlacement}
      />
    );
  }

  if (!search.manifest) {
    return <div>No manifest</div>;
  }

  return (
    <>
      <div
        className={`flex w-full flex-col h-[calc(100vh-4rem)] relative items-center bg-white ${search.minimal ? "minimal-theme" : "delft-exhibition"}`}
        data-cut-corners-enabled="false"
      >
        <ScrollExhibition
          manifest={manifest as any}
          language="en"
          theme={search.minimal ? ({ preset: "minimal" } satisfies Partial<ExhibitionThemeConfig>) : undefined}
          viewObjectLinks={[]}
          options={{
            ignoreCanvasBackgrounds: search.ignoreCanvasBackgrounds,
            tableOfContentsPlacement: search.tableOfContentsPlacement,
          }}
        />
      </div>
    </>
  );
}

function ManifestEditorScrollPreview({
  minimal,
  origin,
  ignoreCanvasBackgrounds,
  tableOfContentsPlacement,
}: {
  minimal: boolean;
  origin?: string;
  ignoreCanvasBackgrounds?: boolean;
  tableOfContentsPlacement?: "footer" | "header";
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
    const target = window.parent !== window ? window.parent : window.opener && !window.opener.closed ? window.opener : null;
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

  if (connection.resource.type !== "Manifest") {
    return (
      <main className="flex h-screen items-center justify-center bg-zinc-950 text-sm text-white/65">
        Scroll preview supports manifests.
      </main>
    );
  }

  return (
    <div
      className={`flex min-h-screen w-full flex-col bg-white ${minimal ? "minimal-theme" : "delft-exhibition"}`}
      data-cut-corners-enabled="false"
    >
      <ScrollExhibition
        key={connection.resource.id}
        manifest={connection.resource.id}
        canvasId={connection.canvasId || undefined}
        showTitleBlock={!connection.canvasId}
        customVault={connection.vault as any}
        skipLoadManifest
        language="en"
        theme={minimal ? ({ preset: "minimal" } satisfies Partial<ExhibitionThemeConfig>) : undefined}
        viewObjectLinks={[]}
        options={{ ignoreCanvasBackgrounds, tableOfContentsPlacement }}
      />
    </div>
  );
}

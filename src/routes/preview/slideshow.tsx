import { createFileRoute } from "@tanstack/react-router";
import { DelftPresentation } from "../../library";
import { fetch } from "@iiif/helpers";
import { getThemeClassName, normalizeThemePreset, type ExhibitionThemeConfig, type FloatingPosition } from "@/theme/exhibition-theme";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MANIFEST_EDITOR_PREVIEW_CONNECT,
  MANIFEST_EDITOR_PREVIEW_READY,
  MANIFEST_EDITOR_PREVIEW_SELECTION,
  ManifestEditorMessagePortVault,
  type PreviewConnectionMessage,
  type PreviewSelectionMessage,
} from "@/helpers/manifest-editor-preview";


export const Route = createFileRoute("/preview/slideshow")({
  component: RouteComponent,
  validateSearch: (search) => {
    return {
      minimal: search.minimal,
      floating: search.floating,
      floatingPosition: search.floatingPosition,
      labelOnlyFloating:
        search["label-only-floating"] === undefined
          ? undefined
          : search["label-only-floating"] === "true" ||
            search["label-only-floating"] === true,
      canvas: search.canvas as string | undefined,
      manifestEditorPreview:
        search["manifest-editor-preview"] === "true" ||
        search["manifest-editor-preview"] === true,
      manifestEditorPreviewOrigin: search[
        "manifest-editor-preview-origin"
      ] as string | undefined,
      ignoreCanvasBackgrounds: search["ignore-canvas-backgrounds"] === "true" || search["ignore-canvas-backgrounds"] === true,
      themePreset: search.theme || search.preset ? normalizeThemePreset(search.theme || search.preset) : undefined,
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
  const themePreset = search.themePreset || (search.minimal ? "minimal" : "delft");

  if (search.manifestEditorPreview) {
    return (
      <ManifestEditorSlideshowPreview
        minimal={!!search.minimal}
        floating={search.floating as any}
        floatingPosition={search.floatingPosition as any}
        labelOnlyFloating={search.labelOnlyFloating as any}
        origin={search.manifestEditorPreviewOrigin}
        ignoreCanvasBackgrounds={search.ignoreCanvasBackgrounds}
        themePreset={search.themePreset}
      />
    );
  }

  if (!search.manifest) {
    return <div>No manifest</div>;
  }

  const manifest = Route.useLoaderData();
  return (
    <>
      <div
        className={`relative flex h-[calc(100vh-4rem)] w-full flex-col items-center ${getThemeClassName(themePreset)}`}
        data-cut-corners-enabled="false"
      >
        <DelftPresentation
          manifest={manifest}
          canvasId={search.canvas}
          language="en"
          theme={{ preset: themePreset } satisfies Partial<ExhibitionThemeConfig>}
          viewObjectLinks={[]}
          options={{
            isFloating: search.floating as any,
            floatingPosition: search.floatingPosition as any,
            labelOnlyFloating: search.labelOnlyFloating as any,
            ignoreCanvasBackgrounds: search.ignoreCanvasBackgrounds,
          }}
        />
      </div>
    </>
  );
}

export function ManifestEditorSlideshowPreview({
  minimal,
  cutCorners,
  floating,
  floatingPosition,
  labelOnlyFloating,
  origin,
  ignoreCanvasBackgrounds,
  themePreset,
}: {
  minimal: boolean;
  cutCorners?: boolean;
  floating?: boolean;
  floatingPosition?: FloatingPosition;
  labelOnlyFloating?: boolean;
  origin?: string;
  ignoreCanvasBackgrounds?: boolean;
  themePreset?: ExhibitionThemeConfig["preset"];
}) {
  const resolvedThemePreset = themePreset || (minimal ? "minimal" : "delft");
  const [connection, setConnection] = useState<{
    vault: ManifestEditorMessagePortVault;
    resource: { id: string; type: string };
    canvasId: string | null;
    annotationId: string | null;
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
            annotationId: data.annotationId || null,
          });
        });
      }

      if (data._type === MANIFEST_EDITOR_PREVIEW_SELECTION) {
        const selection = data as PreviewSelectionMessage;
        setConnection((current) =>
          current
            ? {
                ...current,
                resource: selection.resource || current.resource,
                canvasId: selection.canvasId || null,
                annotationId: selection.annotationId || null,
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

  if (connection.resource.type !== "Manifest") {
    return (
      <main className="flex h-screen items-center justify-center bg-zinc-950 text-sm text-white/65">
        Slideshow preview supports manifests.
      </main>
    );
  }

  return (
    <div
      className={`flex h-screen min-h-0 w-full flex-col overflow-hidden ${getThemeClassName(resolvedThemePreset)}`}
      data-cut-corners-enabled="false"
    >
      <DelftPresentation
        key={connection.resource.id}
        manifest={connection.resource.id}
        canvasId={connection.canvasId || undefined}
        annotationId={connection.annotationId || undefined}
        customVault={connection.vault as any}
        skipLoadManifest
        language="en"
        theme={{ preset: resolvedThemePreset } satisfies Partial<ExhibitionThemeConfig>}
        viewObjectLinks={[]}
        options={{
          cutCorners,
          isFloating: floating as any,
          floatingPosition: floatingPosition as any,
          labelOnlyFloating: labelOnlyFloating as any,
          ignoreCanvasBackgrounds,
        }}
      />
    </div>
  );
}

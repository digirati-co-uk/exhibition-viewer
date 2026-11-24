import { createFileRoute } from "@tanstack/react-router";
import { ScrollExhibition } from "../../library";
import { fetchManifest } from "@/helpers/fetch-manifest";
import { getThemeClassName, type ExhibitionThemeConfig } from "@/theme/exhibition-theme";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MANIFEST_EDITOR_PREVIEW_CONNECT,
  MANIFEST_EDITOR_PREVIEW_READY,
  MANIFEST_EDITOR_PREVIEW_SELECTION,
  ManifestEditorMessagePortVault,
  type PreviewConnectionMessage,
  type PreviewSelectionMessage,
} from "@/helpers/manifest-editor-preview";
import { type PreviewSearchInput, scrollPreviewSearch } from "./-search";

export const Route = createFileRoute("/preview/scroll")({
  component: RouteComponent,
  validateSearch: (search: PreviewSearchInput) => scrollPreviewSearch(
    search,
    "https://heritage.tudelft.nl/iiif/manifests/irrigation-knowledge/manifest.json",
    "delft",
  ),
  loaderDeps: ({ search }) => ({ manifest: search.manifest, manifestEditorPreview: search.manifestEditorPreview }),
  staleTime: 0,

  loader: async ({ deps }) => {
    if (deps.manifestEditorPreview) {
      return null;
    }
    return fetchManifest(
      // "https://heritage.tudelft.nl/iiif/manifests/irrigation-knowledge/manifest.json",
      deps.manifest,
    );
  },
});

function RouteComponent() {
  const search = Route.useSearch();
  const manifest = Route.useLoaderData();
  const options = {
    ignoreCanvasBackgrounds: search.ignoreCanvasBackgrounds,
    showProgressBar: search.showProgressBar,
    showProgressTableOfContents: search.showProgressTableOfContents,
    showScrollToTop: search.showScrollToTop,
    showNavigationControls: search.showNavigationControls,
    tourCaptionClearance: search.tourCaptionClearance,
    tableOfContentsPlacement: search.tableOfContentsPlacement,
  };

  if (search.manifestEditorPreview) {
    return (
      <ManifestEditorScrollPreview
        minimal={false}
        origin={search.manifestEditorPreviewOrigin}
        showTitleBlock={search.showTitleBlock}
        showTableOfContents={search.showTableOfContents}
        themePreset={search.themePreset}
        {...options}
      />
    );
  }

  return (
    <div
      className={`relative flex min-h-screen w-full flex-col items-center ${getThemeClassName(search.themePreset)}`}
      data-cut-corners-enabled="false"
    >
      <ScrollExhibition
        manifest={manifest!}
        preferManifestStyle
        snapAudio
        canvasId={search.canvas}
        language="en"
        showTitleBlock={search.showTitleBlock}
        showTableOfContents={search.showTableOfContents}
        theme={{ preset: search.themePreset }}
        options={options}
      />
    </div>
  );
}

export function ManifestEditorScrollPreview({
  minimal,
  origin,
  ignoreCanvasBackgrounds,
  showTitleBlock,
  showTableOfContents,
  showProgressBar,
  showProgressTableOfContents,
  showScrollToTop,
  showNavigationControls,
  tourCaptionClearance,
  tableOfContentsPlacement,
  themePreset,
}: {
  minimal: boolean;
  origin?: string;
  ignoreCanvasBackgrounds?: boolean;
  showTitleBlock?: boolean;
  showTableOfContents?: boolean;
  showProgressBar?: boolean;
  showProgressTableOfContents?: boolean;
  showScrollToTop?: boolean;
  showNavigationControls?: boolean;
  tourCaptionClearance?: boolean;
  tableOfContentsPlacement?: "header" | "footer" | "none";
  themePreset?: ExhibitionThemeConfig["preset"];
}) {
  const resolvedThemePreset = themePreset || (minimal ? "minimal" : "delft");
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
    const target = window.parent !== window ? window.parent : window.opener && !window.opener.closed ? window.opener : null;
    let selection: { resource: PreviewConnectionMessage["resource"]; canvasId: string | null } | null = null;
    function handleWindowMessage(event: MessageEvent) {
      if (event.origin !== allowedOrigin || event.source !== target) return;
      const data = event.data as PreviewConnectionMessage | PreviewSelectionMessage;
      if (!data || typeof data !== "object") return;

      if (data._type === MANIFEST_EDITOR_PREVIEW_CONNECT) {
        const port = event.ports[0];
        if (!port) return;
        const vault = new ManifestEditorMessagePortVault(port);
        vaultRef.current?.destroy();
        vaultRef.current = vault;
        selection = { resource: data.resource, canvasId: data.canvasId || null };
        void vault.waitUntilReady().then(() => {
          if (vaultRef.current === vault && selection) setConnection({ vault, ...selection });
        });
      }

      if (data._type === MANIFEST_EDITOR_PREVIEW_SELECTION && selection) {
        selection = { resource: data.resource || selection.resource, canvasId: data.canvasId || null };
        const latestSelection = selection;
        const vault = vaultRef.current;
        setConnection((current) => current && current.vault === vault ? { ...current, ...latestSelection } : current);
      }
    }

    window.addEventListener("message", handleWindowMessage);
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
      className={`flex min-h-screen w-full flex-col ${getThemeClassName(resolvedThemePreset)}`}
      data-cut-corners-enabled="false"
    >
      <ScrollExhibition
        key={connection.resource.id}
        manifest={connection.resource.id}
        snapAudio
        showEmptySections
        canvasId={connection.canvasId || undefined}
        showTitleBlock={showTitleBlock}
        preferManifestStyle
        showTableOfContents={showTableOfContents}
        customVault={connection.vault as any}
        skipLoadManifest
        language="en"
        theme={{ preset: resolvedThemePreset } satisfies Partial<ExhibitionThemeConfig>}
        viewObjectLinks={[]}
        options={{
          ignoreCanvasBackgrounds,
          showProgressBar,
          showProgressTableOfContents,
          showScrollToTop,
          showNavigationControls,
          tourCaptionClearance,
          tableOfContentsPlacement,
        }}
      />
    </div>
  );
}

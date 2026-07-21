import { BaseGridSection } from "@/components/shared/BaseGridSection";
import { TableOfContents } from "@/components/shared/TableOfContents";
import { type ScrollThemeOptions, useScrollTheme } from "@/theme/scroll-theme";
import type { Manifest } from "@iiif/presentation-3";
import type { CanvasNormalized, ManifestNormalized } from "@iiif/presentation-3-normalized";
import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { AtlasStoreProvider, LocaleString, useVault, useVaultSelector } from "react-iiif-vault";
import { CanvasPreviewBlock } from "../CanvasPreviewBlock";

export interface ScrollTitleBlockProps {
  manifest: Manifest | ManifestNormalized;
  index?: number;
  showTableOfContents?: boolean;
  options?: ScrollThemeOptions;
}

export function ScrollTitleBlock({ manifest, index = 0, showTableOfContents }: ScrollTitleBlockProps) {
  const { titleBlock } = useScrollTheme();
  const vault = useVault();
  const items = (manifest.items || []).map((item) => ({ label: vault.get(item)?.label }));
  const firstItem = manifest.items?.[0];
  const firstCanvas = useVaultSelector(
    (_, vault) => (firstItem ? vault.get<CanvasNormalized>(firstItem) : undefined),
    [firstItem],
  );
  const splashCanvas = firstCanvas?.behavior?.includes("splash") ? firstCanvas : null;
  const invertSplash = splashCanvas?.behavior?.includes("invert");
  const fixedSplash = splashCanvas?.behavior?.includes("fixed");
  const splashBackground = typeof (splashCanvas as any)?.backgroundColor === "string" ? (splashCanvas as any).backgroundColor : null;
  const titleBoxRef = useRef<HTMLDivElement>(null);
  const [splashProgress, setSplashProgress] = useState(0);
  const hasLabel = Boolean(manifest.label);

  useLayoutEffect(() => {
    if (!splashCanvas) {
      setSplashProgress(0);
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const section = titleBoxRef.current?.closest("section") as HTMLElement | null;
      const start = section?.offsetTop || 0;
      setSplashProgress(Math.max(0, Math.min(1, (window.scrollY - start) / window.innerHeight)));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [splashCanvas]);

  return (
    <BaseGridSection
      enabled
      updatesTitle={false}
      id={`title-${index}`}
      className={
        splashCanvas
          ? `exv-scroll-title-splash relative flex h-screen min-h-screen w-screen items-center justify-center overflow-hidden p-6 text-center sm:p-10 ${invertSplash ? "text-white" : "text-black"}`
          : titleBlock.className
      }
      style={splashBackground ? ({ "--exv-scroll-splash-overlay": splashBackground } as CSSProperties) : undefined}
    >
      {splashCanvas ? (
        <div className={`${fixedSplash ? "fixed" : "absolute"} inset-0 z-0`}>
          <AtlasStoreProvider name={`${splashCanvas.id}-splash`}>
            <CanvasPreviewBlock canvasId={splashCanvas.id} cover disablePopup index={index} showCaption={false} />
          </AtlasStoreProvider>
        </div>
      ) : null}
      <div
        ref={titleBoxRef}
        className={
          splashCanvas
            ? `relative z-20 flex w-full max-w-3xl flex-col gap-6 p-6 sm:p-8 ${splashBackground ? "" : `backdrop-blur-md ${invertSplash ? "bg-black/25" : "bg-white/25"}`}`
            : "relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 sm:px-10"
        }
        style={
          splashCanvas
            ? {
                opacity: 1 - Math.min(1, splashProgress * 1.25),
                transform: `scale(${1 + splashProgress * 0.08})`,
                willChange: "opacity, transform",
              }
            : undefined
        }
      >
        <div className="flex flex-col gap-6">
          <p className="text-xs uppercase tracking-[0.4em] opacity-60">Exhibition</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">
            <LocaleString>{manifest.label}</LocaleString>
          </h1>
          {manifest.summary ? (
            <LocaleString
              as="div"
              enableDangerouslySetInnerHTML
              className={["text-lg leading-relaxed", hasLabel ? "opacity-75" : "opacity-100"].join(" ")}
            >
              {manifest.summary}
            </LocaleString>
          ) : null}
          {manifest.requiredStatement ? (
            <div className="text-sm opacity-75">
              <div className="font-semibold">
                <LocaleString>{manifest.requiredStatement.label}</LocaleString>
              </div>
              <LocaleString>{manifest.requiredStatement.value}</LocaleString>
            </div>
          ) : null}
        </div>

        {/* This doesn't work great with the scrolling. Might need a different variation,
          maybe fixed position on desktop on the left or right */}
        {showTableOfContents ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <TableOfContents items={items} treeLabel={manifest.summary || manifest.label} />
          </div>
        ) : null}
      </div>
    </BaseGridSection>
  );
}

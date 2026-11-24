import type { InternationalString } from "@iiif/presentation-3";
import { LocaleString, useManifest } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { useHashValue } from "@/helpers/use-hash-value";
import { IIIFIcon } from "@/components/icons/IIIFIcon";
import { getCanvasNavigationHref, parseCanvasNavigationIndex } from "@/helpers/canvas-navigation";

export function TableOfContents({
  items,
  canvasIndexes,
  treeLabel,
  enabledCanvasId,
  showManifestDetails = true,
}: {
  treeLabel?: InternationalString | null;
  items: { id?: string; canvasId?: string; label?: InternationalString | null }[];
  canvasIndexes?: ReadonlyMap<string, number>;
  enabledCanvasId?: string;
  showManifestDetails?: boolean;
}) {
  const manifest = useManifest();
  const [hash] = useHashValue();
  const hashAsNumber = parseCanvasNavigationIndex(hash);

  return (
    <>
      <div className="mb-3 flex flex-col gap-4">
        <div className="flex">
          {showManifestDetails ? (
            <LocaleString className="delft-title mb-4 flex-1 text-2xl">
              {manifest?.label}
            </LocaleString>
          ) : (
            <div className="flex-1" />
          )}

          <a
            href={`${manifest?.id}?manifest=${manifest?.id}`}
            target="_blank"
            className=""
            title="Drag and Drop IIIF Resource"
            rel="noreferrer"
          >
            <IIIFIcon
              className="text-xl opacity-50 hover:opacity-100"
              title={"Open IIIF Manifest"}
            />
            <span className="sr-only">Open IIIF Manifest</span>
          </a>
        </div>
        {showManifestDetails && treeLabel ? (
          <LocaleString as="div" className="text-lg" enableDangerouslySetInnerHTML>
            {treeLabel}
          </LocaleString>
        ) : null}
      </div>
      <ol className="list-decimal flex flex-col gap-2 font-mono">
        {items.map((item, idx) => {
          if (!item.label) return null;
          const itemId = item.canvasId || item.id;
          const index = canvasIndexes && itemId ? canvasIndexes.get(itemId) : idx;
          const disabled = index === undefined || Boolean(enabledCanvasId && itemId !== enabledCanvasId);
          const href = !disabled && index !== undefined ? getCanvasNavigationHref(index) : undefined;
          return (
            <li key={`toc_entry_${idx}`} className={twMerge("marker:text-current", disabled && "opacity-35")}>
              <LocaleString
                as={disabled ? "span" : "a"}
                className={twMerge(
                  "text-md",
                  disabled ? "cursor-not-allowed" : "hover:underline",
                  hashAsNumber === index && !disabled ? "underline" : "",
                )}
                href={href}
                onClick={() => {
                  // Clicking the current URL hash again still needs to navigate after using Next/Previous.
                  if (href && window.location.hash === href) {
                    window.dispatchEvent(new HashChangeEvent("hashchange"));
                  }
                }}
                aria-disabled={disabled || undefined}
              >
                {item.label}
              </LocaleString>
            </li>
          );
        })}
      </ol>
    </>
  );
}

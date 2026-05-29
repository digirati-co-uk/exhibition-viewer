import type { InternationalString } from "@iiif/presentation-3";
import { LocaleString, useManifest } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { useHashValue } from "@/helpers/use-hash-value";
import { IIIFIcon } from "@/components/icons/IIIFIcon";

function parseCanvasHashIndex(hash: string | null) {
  if (!hash) return null;
  const value = hash.startsWith("s") ? hash.slice(1) : hash;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function TableOfContents({
  items,
  treeLabel,
  enabledCanvasId,
}: {
  treeLabel?: InternationalString | null;
  items: { id?: string; canvasId?: string; label?: InternationalString | null }[];
  enabledCanvasId?: string;
}) {
  const manifest = useManifest();
  const [hash] = useHashValue();
  const hashAsNumber = parseCanvasHashIndex(hash);

  return (
    <>
      <div className="mb-3 flex flex-col gap-4">
        <div className="flex">
          <LocaleString className="text-2xl uppercase mb-4 flex-1">
            {manifest?.label}
          </LocaleString>

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
        {treeLabel ? (
          <LocaleString className="text-lg">{treeLabel}</LocaleString>
        ) : null}
      </div>
      <ol className="list-decimal flex flex-col gap-2 font-mono">
        {items.map((item, idx) => {
          if (!item.label) return null;
          const itemId = item.id || item.canvasId;
          const disabled = Boolean(enabledCanvasId && itemId && itemId !== enabledCanvasId);
          return (
            <li key={`toc_entry_${idx}`} className={twMerge("marker:text-white/40", disabled && "opacity-35")}>
              <LocaleString
                as={disabled ? "span" : "a"}
                className={twMerge(
                  "text-md",
                  disabled ? "cursor-not-allowed" : "hover:underline",
                  hashAsNumber === idx && !disabled ? "underline" : "",
                )}
                href={disabled ? undefined : `#s${idx}`}
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

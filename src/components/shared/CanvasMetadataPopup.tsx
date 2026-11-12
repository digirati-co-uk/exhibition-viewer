import { CloseIcon } from "@/components/icons/CloseIcon";
import { InfoIcon } from "@/components/icons/InfoIcon";
import { getCanvasMetadataContent, hasCanvasMetadataContent } from "@/helpers/canvas-metadata";
import { getValue } from "@iiif/helpers";
import { Popover } from "@headlessui/react";
import { LocaleString, Metadata, useCanvas } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";

const metadataClasses = {
  container: "w-full block [&>tbody]:block",
  row: "flex flex-col py-1.5 w-full",
  label: "w-full text-sm font-semibold mb-0.5 opacity-80",
  value: "block w-full text-sm whitespace-pre-wrap [overflow-wrap:anywhere] [&_a]:underline [&_a:hover]:opacity-80",
  empty: "opacity-60",
};

export interface CanvasMetadataPopupProps {
  /** Standard-enabled; only an explicit `false` hides the popup. */
  enabled?: boolean;
  className?: string;
  /** Extra text used for the accessible name when the canvas has no label. */
  fallbackLabel?: string;
  /** @deprecated Empty canvases no longer render a decorative metadata icon. */
  decorativeFallback?: boolean;
}

/**
 * Accessible metadata popup for the current canvas (must be inside a CanvasContext).
 * The trigger is a real button (aria-expanded/aria-controls), the panel is a non-modal
 * dialog that closes with Escape / outside click / its close button and returns focus.
 *
 * It must be rendered as a *sibling* of any clickable slide surface, never inside it.
 */
export function CanvasMetadataPopup({
  enabled = true,
  className,
  fallbackLabel = "this slide",
}: CanvasMetadataPopupProps) {
  const canvas = useCanvas();
  const content = getCanvasMetadataContent(canvas as any);
  const hasContent = enabled && hasCanvasMetadataContent(content);

  if (!hasContent) return null;

  const name = getValue(canvas?.label) || fallbackLabel;

  return (
    <Popover className="contents">
      <Popover.Button
        type="button"
        aria-label={`Show information about ${name}`}
        className={twMerge(
          "exhibition-metadata-trigger absolute right-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-ImageCaptionBackground text-2xl text-ImageCaption backdrop-blur-md hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--delft-control-bar-border)]",
          className
        )}
      >
        <InfoIcon />
      </Popover.Button>
      <Popover.Panel
        focus
        onKeyDown={(event) => {
          // Keep presentation shortcuts from handling navigation while reading metadata.
          if (
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown", " "].includes(
              event.key
            )
          ) {
            event.stopPropagation();
          }
        }}
        role="dialog"
        aria-label={`Information about ${name}`}
        className="exhibition-metadata-panel absolute right-3 top-16 z-30 max-h-[calc(100%-5rem)] w-[min(24rem,calc(100%-1.5rem))] overflow-y-auto rounded bg-InfoBlock p-4 text-sm text-InfoBlockText shadow-lg [overflow-wrap:anywhere]"
      >
        {({ close }) => (
          <>
            <div className="mb-2 flex items-start justify-between gap-3">
              <h2 className="m-0 text-base font-semibold">Information</h2>
              <button
                type="button"
                aria-label="Close information"
                onClick={() => close()}
                className="-mr-2 -mt-2 flex h-9 w-9 flex-shrink-0 items-center justify-center bg-CloseBackground text-CloseText hover:bg-CloseBackgroundHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <CloseIcon fill="currentColor" />
              </button>
            </div>
            <div className="grid gap-3">
              {content.metadata.length ? (
                <Metadata allowHtml classes={metadataClasses} metadata={content.metadata} showEmptyMessage={false} />
              ) : null}
              {content.rights ? (
                <div>
                  <h3 className="m-0 text-sm font-semibold opacity-80">Rights</h3>
                  {/^https?:\/\//i.test(content.rights) ? (
                    <a className="underline" href={content.rights} rel="noreferrer noopener" target="_blank">
                      {content.rights}
                    </a>
                  ) : (
                    <span>{content.rights}</span>
                  )}
                </div>
              ) : null}
              {content.requiredStatement ? (
                <div>
                  {content.requiredStatement.label ? (
                    <h3 className="m-0 text-sm font-semibold opacity-80">
                      <LocaleString>{content.requiredStatement.label}</LocaleString>
                    </h3>
                  ) : null}
                  <LocaleString as="div" enableDangerouslySetInnerHTML>
                    {content.requiredStatement.value}
                  </LocaleString>
                </div>
              ) : null}
            </div>
          </>
        )}
      </Popover.Panel>
    </Popover>
  );
}

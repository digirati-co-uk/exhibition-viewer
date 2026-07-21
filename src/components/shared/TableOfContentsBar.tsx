import { ExhibitionDialog as Dialog } from "@/theme/exhibition-theme-context";
import { createRangeHelper, getValue } from "@iiif/helpers";
import type { InternationalString } from "@iiif/presentation-3";
import { useId, useMemo, useRef, useState } from "react";
import { usePress } from "react-aria";
import { LocaleString, useManifest, useVault, useVaultSelector } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { useHashValue } from "../../helpers/use-hash-value";
import { ContentsIcon } from "../icons/ContentsIcon";
import { TableOfContents } from "./TableOfContents";
import { parseCanvasNavigationIndex } from "../../helpers/canvas-navigation";

export function TableOfContentsBar({
  initialOpen = false,
  hideInitial = false,
  hideTable = false,
  fixed = false,
  content,
  onPlay,
  children,
  enabledCanvasId,
  showManifestDetails = true,
}: {
  hideInitial?: boolean;
  initialOpen?: boolean;
  fixed?: boolean;
  hideTable?: boolean;
  content: { tableOfContents: string | InternationalString };
  onPlay?: () => void;
  children?: React.ReactNode;
  enabledCanvasId?: string;
  showManifestDetails?: boolean;
}) {
  const [hash] = useHashValue(() => {
    // custom on change.
    setTocOpen(false);
  });
  const manifest = useManifest();
  const vault = useVault();
  const rangeHelper = useMemo(() => createRangeHelper(vault), [vault]);
  const range = useVaultSelector((s, vault) => vault.get((manifest?.structures || [])[0]));
  const canvases = useVaultSelector((s, vault) => vault.get(manifest?.items || []));
  const tree = useMemo(() => rangeHelper.rangeToTableOfContentsTree(range), [range, rangeHelper]);

  const items = tree?.items || canvases || [];

  const hashAsNumber = parseCanvasNavigationIndex(hash);
  const currentItem = hashAsNumber === null ? null : items[hashAsNumber];

  const [isTocOpen, setTocOpen] = useState(initialOpen);
  const dialogId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = () => {
    setTocOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const toggleProps = usePress({
    onPress: (event) => {
      triggerRef.current = event.target as HTMLButtonElement;
      setTocOpen((o) => !o);
    },
  });

  return (
    <div className="relative">
      <div
        className={twMerge(
          "delft-toc-bar z-30 h-14 flex items-center flex-col justify-center bg-ControlBar",
          "transition-opacity drop-shadow-lg px-4",

          fixed && "fixed bottom-0 left-0 right-0 px-4 lg:px-9",

          currentItem || !hideInitial ? "pointer-events-auto opacity-1" : "pointer-events-none opacity-0",
        )}
      >
        <div className="relative z-30 w-full max-w-screen-xl px-5 lg:px-10">
          <div className="flex flex-row items-center justify-between gap-2 text-lg font-medium text-ControlBarText sm:text-2xl font-mono">
            <div className="my-2 font-light flex-1 min-w-0">
              <button
                type="button"
                className="delft-title z-50 text-ControlBarText overflow-ellipsis overflow-hidden whitespace-nowrap max-w-full"
                aria-label={`${isTocOpen ? "Hide" : "Show"} table of contents`}
                aria-expanded={isTocOpen}
                aria-haspopup="dialog"
                aria-controls={dialogId}
                {...toggleProps.pressProps}
              >
                {currentItem?.label ? (
                  <LocaleString>{currentItem?.label}</LocaleString>
                ) : (
                  <LocaleString>{content.tableOfContents}</LocaleString>
                )}
              </button>
            </div>
            <div className="flex flex-row items-center gap-2 text-3xl flex-shrink-0">
              {hideTable ? null : (
                <button
                  type="button"
                  className="z-50 hover:bg-black/10 w-10 h-10 rounded flex items-center justify-center"
                  {...toggleProps.pressProps}
                  aria-label={`${isTocOpen ? "Hide" : "Show"} table of contents`}
                  aria-expanded={isTocOpen}
                  aria-haspopup="dialog"
                  aria-controls={dialogId}
                >
                  <span aria-hidden="true"><ContentsIcon /></span>
                </button>
              )}

              {/* Additional controls. */}
              {children}
            </div>
          </div>
        </div>
      </div>

      <Dialog
        aria-label="Table of contents"
        className={twMerge(
          "exhibition-viewer exhibition-viewer-toc",
          fixed ? "exhibition-viewer-toc--fixed" : "exhibition-viewer-toc--absolute",
          "transition-all duration-300 ease-in-out transform origin-bottom",
          isTocOpen ? "exhibition-viewer-toc--open" : "exhibition-viewer-toc--closed",
        )}
        open={isTocOpen}
        onClose={close}
      >
        <Dialog.Panel id={dialogId} className="delft-toc-contents z-40 flex w-full max-w-screen-xl flex-col px-10 py-6 text-ControlBarText border-b overflow-y-auto border-ControlBarBorder">
          <TableOfContents treeLabel={tree?.label} items={items} enabledCanvasId={enabledCanvasId} showManifestDetails={showManifestDetails} />
        </Dialog.Panel>
      </Dialog>
    </div>
  );
}

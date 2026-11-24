import type { SearchSchemaInput } from "@tanstack/react-router";
import { type FloatingPosition, normalizeThemePreset } from "../../theme/exhibition-theme";

/**
 * Input type for the preview routes' `validateSearch`. Marking the input with `SearchSchemaInput` tells the router
 * that links only need to supply raw (unvalidated) params, rather than the fully validated output.
 */
export type PreviewSearchInput = Record<string, unknown> & SearchSchemaInput;

export type ScrollTableOfContentsPlacement = "header" | "footer" | "none";

export function tableOfContentsPlacement(value: unknown): ScrollTableOfContentsPlacement | undefined {
  return value === "header" || value === "footer" || value === "none" ? value : undefined;
}

export function exhibitionTableOfContentsPlacement(value: unknown): "header" | "footer" | undefined {
  return value === "header" || value === "footer" ? value : undefined;
}

export function optionalBoolean(value: unknown): boolean | undefined {
  return value === "true" || value === true ? true : value === "false" || value === false ? false : undefined;
}

const FLOATING_POSITIONS: readonly FloatingPosition[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "top",
  "bottom",
  "left",
  "right",
];

export function floatingPosition(value: unknown): FloatingPosition | undefined {
  return FLOATING_POSITIONS.find((position) => position === value);
}

/** Reads a search param that may be supplied in either kebab-case or camelCase. */
export function searchParam(search: Record<string, unknown>, kebab: string, camel: string): unknown {
  return search[kebab] ?? search[camel];
}

export function scrollPreviewSearch(search: PreviewSearchInput, defaultManifest: string, defaultTheme: string) {
  return {
    manifest: typeof search.manifest === "string" && search.manifest ? search.manifest : defaultManifest,
    canvas: typeof search.canvas === "string" ? search.canvas : undefined,
    themePreset: normalizeThemePreset(
      search.theme || search.preset || search.themePreset || (optionalBoolean(search.minimal) ? "minimal" : defaultTheme),
    ),
    manifestEditorPreview: optionalBoolean(searchParam(search, "manifest-editor-preview", "manifestEditorPreview")) ?? false,
    manifestEditorPreviewOrigin: searchParam(search, "manifest-editor-preview-origin", "manifestEditorPreviewOrigin") as string | undefined,
    ignoreCanvasBackgrounds: optionalBoolean(searchParam(search, "ignore-canvas-backgrounds", "ignoreCanvasBackgrounds")),
    showTitleBlock: optionalBoolean(searchParam(search, "show-title-block", "showTitleBlock")),
    showTableOfContents: optionalBoolean(searchParam(search, "show-table-of-contents", "showTableOfContents")),
    showProgressBar: optionalBoolean(searchParam(search, "show-progress-bar", "showProgressBar")),
    showProgressTableOfContents: optionalBoolean(searchParam(search, "show-progress-table-of-contents", "showProgressTableOfContents")),
    showScrollToTop: optionalBoolean(searchParam(search, "show-scroll-to-top", "showScrollToTop")),
    showNavigationControls: optionalBoolean(searchParam(search, "show-navigation-controls", "showNavigationControls")),
    tourCaptionClearance: optionalBoolean(searchParam(search, "tour-caption-clearance", "tourCaptionClearance")),
    tableOfContentsPlacement: tableOfContentsPlacement(searchParam(search, "toc-placement", "tableOfContentsPlacement")),
  };
}

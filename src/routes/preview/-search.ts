import type { SearchSchemaInput } from "@tanstack/react-router";
import type { FloatingPosition } from "../../theme/exhibition-theme";

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

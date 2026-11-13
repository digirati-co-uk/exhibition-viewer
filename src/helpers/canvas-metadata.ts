import { sanitizeCreditStatement } from "./descriptive-html";
import type { InternationalString, MetadataItem } from "@iiif/presentation-3";

/**
 * Information shown by the slide metadata popup (the repurposed "info" icon).
 * Mirrors what the IIIF Browser's manifest information popover shows: metadata
 * pairs, rights and the required statement.
 */
export interface CanvasMetadataContent {
  metadata: MetadataItem[];
  rights: string | null;
  requiredStatement: MetadataItem | null;
}

function hasText(value: InternationalString | string | null | undefined): boolean {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return Object.values(value).some((values) => (values || []).some((text) => typeof text === "string" && text.trim()));
}

function isPresentable(item: Partial<MetadataItem> | null | undefined): item is MetadataItem {
  return !!item && (hasText(item.label) || hasText(item.value));
}

export function getCanvasMetadataContent(
  canvas:
    | {
        metadata?: MetadataItem[] | null;
        rights?: string | null;
        requiredStatement?: MetadataItem | null;
      }
    | null
    | undefined
): CanvasMetadataContent {
  const metadata = (Array.isArray(canvas?.metadata) ? canvas.metadata : [])
    .filter(isPresentable)
    .map(sanitizeCreditStatement);
  const rights = typeof canvas?.rights === "string" && canvas.rights.trim() ? canvas.rights.trim() : null;
  const requiredStatement =
    canvas?.requiredStatement && hasText(canvas.requiredStatement.value)
      ? sanitizeCreditStatement(canvas.requiredStatement)
      : null;

  return { metadata, rights, requiredStatement };
}

/** Rights and attribution enrich the popup, but only canvas metadata makes its trigger visible. */
export function hasCanvasMetadataContent(content: CanvasMetadataContent): boolean {
  return content.metadata.length > 0;
}

/**
 * Standard-enabled feature flags: only an explicit `false` turns the popup off.
 * Precedence: explicit prop > surrounding (scroll) theme option > enabled.
 */
export function resolveMetadataPopupEnabled(...flags: Array<boolean | null | undefined>): boolean {
  for (const flag of flags) {
    if (typeof flag === "boolean") return flag;
  }
  return true;
}

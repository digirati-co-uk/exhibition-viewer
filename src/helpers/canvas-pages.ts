import type { Vault } from "@iiif/helpers/vault";
import type { AnnotationPageNormalized, CanvasNormalized } from "@iiif/presentation-3-normalized";

type Ref = { id: string; type: string };
type AnnotationRef = { id: string; type: "Annotation" };

function getPages(vault: Vault, refs: Ref[] | undefined) {
  return (refs?.length ? vault.get<AnnotationPageNormalized>(refs as any) : []) as Array<AnnotationPageNormalized | undefined>;
}

/** Every painting annotation reference on the canvas, across all of its painting pages. */
export function getPaintingItemRefs(vault: Vault, canvas: Pick<CanvasNormalized, "items">): AnnotationRef[] {
  return getPages(vault, canvas.items as Ref[]).flatMap((page) => (page?.items || []) as AnnotationRef[]);
}

/** Every non-painting annotation reference on the canvas, across all of its annotation pages. */
export function getAnnotationItemRefs(vault: Vault, canvas: Pick<CanvasNormalized, "annotations">): AnnotationRef[] {
  return getPages(vault, canvas.annotations as Ref[]).flatMap((page) => (page?.items || []) as AnnotationRef[]);
}

export function hasAnnotationItems(vault: Vault, canvas: Pick<CanvasNormalized, "annotations">) {
  return getPages(vault, canvas.annotations as Ref[]).some((page) => (page?.items?.length ?? 0) > 0);
}

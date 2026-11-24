import type { Annotation, Canvas } from "@iiif/presentation-3";
import { expandTarget, useCanvas, useVaultSelector } from "react-iiif-vault";
import { getAnnotationItemRefs } from "./canvas-pages";

function collectStylesheets(input: unknown, stylesheets: Record<string, string>) {
  if (!input) return;
  if (Array.isArray(input)) {
    input.forEach((item) => collectStylesheets(item, stylesheets));
    return;
  }
  if (typeof input === "object" && "value" in input && typeof input.value === "string") {
    const id = "id" in input && typeof input.id === "string" ? input.id : `stylesheet-${Object.keys(stylesheets).length}`;
    const cacheKey = `${id}-${input.value}`;
    stylesheets[cacheKey] = input.value;
  }
}

function getLoadedStylesheets(...annotations: Annotation[]) {
  const stylesheets: Record<string, string> = {};

  annotations.forEach((annotation) => {
    collectStylesheets((annotation as any).stylesheet, stylesheets);
    const targets = Array.isArray(annotation.target) ? annotation.target : [annotation.target];
    targets.forEach((target) => collectStylesheets((target as any)?.stylesheet, stylesheets));
  });

  return Object.keys(stylesheets).length ? stylesheets : undefined;
}

function getHighlightTarget(target: Annotation["target"]) {
  if (!target || typeof target !== "object" || Array.isArray(target)) return target;
  return Array.isArray((target as any).selector) && (target as any).selector.length === 1
    ? { ...(target as any), selector: (target as any).selector[0] }
    : target;
}

export function useCanvasHighlights() {
  const canvas = useCanvas();
  const pageRefs = canvas?.annotations;

  return useVaultSelector((_, vault) => {
    return getAnnotationItemRefs(vault, { annotations: pageRefs || [] })
      .map((ref) => {
        const annotation = vault.get<Annotation>(ref);
        if (!annotation?.target) return null;

        const target = vault.get<Canvas | Annotation>(annotation.target as any);
        if (!target) return null;

        if (target.type === "Annotation") {
          return {
            ...expandTarget(getHighlightTarget(target.target) as any, {
              loadedStylesheets: getLoadedStylesheets(annotation as any, target as any),
              styleClass: (annotation.target as any).styleClass,
            }),
            annotationId: target.id,
          };
        }

        if (target.type !== "Canvas") return null;

        return {
          ...expandTarget(getHighlightTarget(annotation.target as any) as any, {
            loadedStylesheets: getLoadedStylesheets(annotation as any),
          }),
          annotationId: annotation.id,
        };
      })
      .filter(Boolean);
  }, [pageRefs]);
}

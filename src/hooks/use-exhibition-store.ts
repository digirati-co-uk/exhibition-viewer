import type { Canvas } from "@iiif/presentation-3";
import { useEffect, useMemo } from "react";
import { useManifest, useVault } from "react-iiif-vault";
import { useStore } from "zustand";
import { getCanvasNavigationId, parseCanvasNavigationIndex } from "../helpers/canvas-navigation";
import { createExhibitionStore } from "../helpers/exhibition-store";
import type { ObjectLink } from "../helpers/object-links";
import { useHashValue } from "../helpers/use-hash-value";

export function useExhibitionStore({
  canvasId,
  annotationId,
  viewObjectLinks,
  autoPlay,
}: {
  canvasId?: string;
  annotationId?: string;
  viewObjectLinks?: ObjectLink[];
  autoPlay?: boolean;
}) {
  const manifest = useManifest();
  const vault = useVault();
  const store = useMemo(() => {
    const hash = typeof window === "undefined" ? null : window.location.hash.slice(1);
    return createExhibitionStore({
      vault,
      manifest: canvasId ? undefined : manifest || undefined,
      canvases: canvasId ? (manifest?.items.filter((canvas) => canvas.id === canvasId) as Canvas[]) : undefined,
      objectLinks: viewObjectLinks,
      startCanvasIndex: canvasId ? 0 : parseCanvasNavigationIndex(hash) ?? 0,
      firstStep: true,
      collapseNonLinearTourCanvases: true,
    });
  }, [vault, manifest?.items, canvasId, viewObjectLinks]);
  const state = useStore(store);
  const step = state.steps[state.currentStep];
  const [, setHash] = useHashValue();

  useEffect(() => {
    if (canvasId) return;
    function navigateToHash() {
      const index = parseCanvasNavigationIndex(window.location.hash.slice(1));
      if (index !== null) store.getState().goToCanvasIndex(index);
    }
    window.addEventListener("hashchange", navigateToHash);
    return () => window.removeEventListener("hashchange", navigateToHash);
  }, [canvasId, store]);

  useEffect(() => {
    if (!annotationId && !canvasId) return;
    const index = annotationId
      ? state.steps.findIndex((item) => item.annotationId === annotationId || item.behaviorAnnotationId === annotationId)
      : 0;
    if (index !== -1) store.getState().goToStep(index);
  }, [annotationId, canvasId, state.steps, store]);

  useEffect(() => {
    if (autoPlay && store.getState().steps.length > 1) store.getState().play();
    return () => store.getState().pause();
  }, [autoPlay, store]);

  useEffect(() => {
    if (step) setHash(getCanvasNavigationId(step.canvasIndex));
  }, [step?.canvasIndex, store, setHash]);

  return store;
}

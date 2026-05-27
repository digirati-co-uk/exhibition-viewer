import { createPaintingAnnotationsHelper } from "@iiif/helpers";
import { useCallback, useEffect, useMemo } from "react";
import { getRenderingStrategy, useExistingVault, type RenderingStrategy } from "react-iiif-vault";
import { useStore } from "zustand";
import { createExhibitionStore, type ExhibitionStore } from "../helpers/exhibition-store";
import { useHashValue } from "../helpers/use-hash-value";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import type { Reference } from "@iiif/presentation-3";

export function useExhibitionStore(props: {
  manifest: any;
  canvasId?: string;
  viewObjectLinks?: any[];
  options?: {
    autoPlay?: boolean;
  };
}): {
  step: any;
  store: ReturnType<typeof createExhibitionStore>;
  state: ExhibitionStore;
  vault: ReturnType<typeof useExistingVault>;
  paintingHelper: ReturnType<typeof createPaintingAnnotationsHelper>,
  toRenderables: (canvas: CanvasNormalized | Reference<"Canvas">, canvasIndex: number) => (null | ({
    index: number,
    canvas: CanvasNormalized,
    strategy: RenderingStrategy,
    foundLinks: any[],
  })),
} {

  const vault = useExistingVault();

  // Need to load the manifest.
  if (props.manifest?.id && !vault.requestStatus(props.manifest.id)) {
    vault.loadSync(
      props.manifest.id,
      JSON.parse(JSON.stringify(props.manifest)),
    );
  }

  const { autoPlay = false } = props.options || {};

  const [hash, setHash] = useHashValue((idx) => {
    const idxAsNumber = idx ? Number.parseInt(idx.slice(1), 10) : null;
    if (idxAsNumber) {
      store.getState().goToCanvasIndex(idxAsNumber);
    }
  });

  // If a specific canvasId is provided, find its index to use as the start position.
  const canvasIdStartIndex = useMemo(() => {
    if (!props.canvasId || !props.manifest?.items) return null;
    const idx = (props.manifest.items as Array<{ id: string }>).findIndex((c) => c.id === props.canvasId);
    return idx !== -1 ? idx : null;
  }, [props.canvasId, props.manifest]);

  const startCanvasIndex = canvasIdStartIndex ?? (hash ? Number.parseInt(hash, 10) : 0);
  const paintingHelper = useMemo(() => createPaintingAnnotationsHelper(), []);
  const store = useMemo(
    () =>
      createExhibitionStore({
        vault: vault as any,
        manifest: props.manifest,
        objectLinks: props.viewObjectLinks || [],
        startCanvasIndex,
        firstStep: true,
      }),
    [vault, props.manifest],
  );
  const state = useStore(store);

  const step = state.currentStep === -1 ? null : state.steps[state.currentStep];

  useEffect(() => {
    if (autoPlay) {
      state.play();
    }
  }, []);

  useEffect(() => {
    if (step?.canvasIndex) {
      setHash(`s${step?.canvasIndex}`);
    }
  }, [step?.canvasIndex]);

  useEffect(() => {
    if (step?.canvasIndex) {
      setHash(`s${step?.canvasIndex}`);
    }
  }, [step?.canvasIndex]);

  const toRenderables = useCallback((canvas: any, index: any) => {
    const paintables = paintingHelper.getPaintables(canvas);
    try {
      const strategy = getRenderingStrategy({
        canvas,
        loadImageService: (t) => t,
        paintables,
        supports: [
          "empty",
          "images",
          "media",
          "video",
          "3d-model",
          "textual-content",
          "complex-timeline",
        ],
      });

      const foundLinks = (props.viewObjectLinks || []).filter(
        (link) => link.canvasId === canvas.id,
      );

      return {
        index,
        canvas,
        strategy,
        foundLinks,
      };
    } catch (e) {
      return null;
    }
  }, []);

  return {
    step,
    state,
    vault,
    store,
    paintingHelper,
    toRenderables,
  };
}

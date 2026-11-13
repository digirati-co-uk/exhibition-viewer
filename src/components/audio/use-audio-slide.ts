import { getValue } from "@iiif/helpers";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { useMemo } from "react";
import { getCanvasMetadataContent } from "@/helpers/canvas-metadata";
import type { MetadataItem } from "@iiif/presentation-3";
import type { MediaStrategy } from "react-iiif-vault";
import { useVault } from "react-iiif-vault";
import {
  type AudioThemeOptions,
  type ResolvedAudioOptions,
  findWaveformResource,
  resolveAudioOptions,
} from "@/helpers/audio";

export interface AudioSlide {
  src: string;
  duration: number | undefined;
  title: string | undefined;
  waveformUrl: string | null;
  waveformValue?: unknown;
  options: ResolvedAudioOptions;
  label: CanvasNormalized["label"];
  summary: CanvasNormalized["summary"];
  /** Non-empty `requiredStatement` of the canvas; rendered by the player, not by the layouts. */
  requiredStatement: MetadataItem | null;
}

/**
 * Everything an audio slide needs from the canvas + its Sound painting annotation: the source, the optional
 * pre-computed waveform, and the resolved options (theme defaults overridden by canvas behaviors).
 */
export function useAudioSlide(
  canvas: CanvasNormalized,
  strategy: MediaStrategy,
  audio?: Partial<AudioThemeOptions> | null,
): AudioSlide {
  const vault = useVault();
  const media = strategy.media as any;
  const annotation = media.annotation;
  const behavior = canvas.behavior;

  const options = useMemo(() => resolveAudioOptions(behavior, audio), [behavior, audio]);

  const waveform = useMemo(() => {
    const resolve = (references: unknown) => {
      try {
        return references ? (vault.get(references as any) as any[]) : [];
      } catch {
        return [];
      }
    };
    const body = resolve(annotation?.body);
    return findWaveformResource(
      resolve((canvas as any).rendering),
      resolve((canvas as any).seeAlso),
      body,
      body.flatMap((item) => [...resolve(item?.rendering), ...resolve(item?.seeAlso)]),
    );
  }, [vault, annotation, canvas]);

  const label = canvas.label || annotation?.label;
  const summary = canvas.summary || annotation?.summary;

  return {
    src: media.url,
    duration: typeof media.duration === "number" && media.duration > 0 ? media.duration : undefined,
    title: (label && getValue(label)) || undefined,
    waveformUrl: waveform?.id || null,
    waveformValue: waveform?.value,
    options,
    label,
    summary,
    requiredStatement: getCanvasMetadataContent(canvas as any).requiredStatement,
  };
}

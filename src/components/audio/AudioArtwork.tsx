import { getValue } from "@iiif/helpers";
import { useState } from "react";
import { CanvasContext, useCanvas, useThumbnail } from "react-iiif-vault";
import type { AudioImageFit } from "@/helpers/audio";
import { AudioNoteGlyph } from "./AudioIcons";

type CanvasReference = { id?: string } | Array<{ id?: string }> | null | undefined;

function firstId(reference: CanvasReference) {
  const item = Array.isArray(reference) ? reference[0] : reference;
  return typeof item?.id === "string" ? item.id : null;
}

/** `accompanyingCanvas` first, then `placeholderCanvas`; otherwise the canvas' own thumbnail. */
export function getAudioArtworkCanvasId(
  canvas: { accompanyingCanvas?: CanvasReference; placeholderCanvas?: CanvasReference } | null | undefined
) {
  return firstId(canvas?.accompanyingCanvas) || firstId(canvas?.placeholderCanvas);
}

/** The slide may override its artwork's colour; the editor's image field writes backgroundColor. */
export function getAudioArtworkTint(
  ...canvases: Array<{ backgroundColor?: unknown; background?: unknown } | null | undefined>
) {
  for (const canvas of canvases) {
    for (const value of [canvas?.backgroundColor, canvas?.background]) {
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return undefined;
}

/**
 * Artwork layer for an audio slide (must be inside the audio Canvas' CanvasContext).
 * `contain` letter-boxes the image over a soft blurred copy of itself; `cover` fills the slide.
 */
export function AudioArtwork({ fit }: { fit: AudioImageFit }) {
  const canvas = useCanvas();
  const artworkId = getAudioArtworkCanvasId(canvas as any);

  return (
    <div className="exv-audio-art absolute inset-0 overflow-hidden bg-ViewerBackground" data-audio-art-fit={fit}>
      <div className="exv-audio-art-fallback" aria-hidden="true">
        <AudioNoteGlyph />
      </div>
      {artworkId ? (
        <CanvasContext canvas={artworkId}>
          <ArtworkImage fit={fit} slideTint={getAudioArtworkTint(canvas as any)} />
        </CanvasContext>
      ) : (
        <ArtworkImage fit={fit} />
      )}
    </div>
  );
}

function ArtworkImage({ fit, slideTint }: { fit: AudioImageFit; slideTint?: string }) {
  const canvas = useCanvas();
  const thumbnail = useThumbnail({ width: 1600, height: 1600 });
  const [failed, setFailed] = useState<string | null>(null);
  const url = thumbnail?.id;
  const tint = slideTint || getAudioArtworkTint(canvas as any);

  if (!url || failed === url) return null;

  // Decorative unless the artwork has its own label (screen readers get the slide title from the player).
  const alt = getValue(canvas?.label) || "";

  return (
    <>
      {fit === "contain" ? <img className="exv-audio-art-backdrop" src={url} alt="" aria-hidden="true" /> : null}
      {fit === "contain" && tint ? (
        <div
          className="exv-audio-art-tint absolute inset-0 pointer-events-none"
          style={{ backgroundColor: tint, opacity: 0.55 }}
          aria-hidden="true"
        />
      ) : null}
      <img
        src={url}
        alt={alt}
        draggable={false}
        decoding="async"
        style={{ objectFit: fit, objectPosition: "center" }}
        onError={() => setFailed(url)}
      />
    </>
  );
}

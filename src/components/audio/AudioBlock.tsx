import { CanvasMetadataPopup } from "@/components/shared/CanvasMetadataPopup";
import type { AudioThemeOptions } from "@/helpers/audio";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import type { MediaStrategy } from "react-iiif-vault";
import { BaseExhibitionBlock } from "../exhibition/BaseExhibitionBlock";
import { AudioPlayer } from "./AudioPlayer";
import { useAudioSlide } from "./use-audio-slide";

export interface AudioBlockProps {
  canvas: CanvasNormalized;
  strategy: MediaStrategy;
  index: number;
  id?: string;
  scrollEnabled?: boolean;
  fullWidthGrid?: boolean;
  metadataPopup?: boolean;
  /** Theme-level audio defaults (`theme.audio`); canvas behaviors override these. */
  audio?: Partial<AudioThemeOptions> | null;
}

/**
 * Audio slide for the full-page grid and the slideshow carousel. It plays inline in the grid cell it is allocated -
 * never in a dialog or fullscreen - and `left` / `right` / `top` / `bottom` label + summary placement is handled by the
 * shared BaseExhibitionBlock, exactly like image slides.
 */
export function AudioBlock(props: AudioBlockProps) {
  const slide = useAudioSlide(props.canvas, props.strategy, props.audio);
  const behavior = props.canvas.behavior || [];
  const hasSidePanel = Boolean(
    props.canvas.summary && ["left", "right", "top", "bottom"].some((item) => behavior.includes(item))
  );

  return (
    <BaseExhibitionBlock
      id={props.id}
      index={props.index}
      scrollEnabled={props.scrollEnabled}
      fullWidthGrid={props.fullWidthGrid}
    >
      <div className="relative h-full w-full min-h-[16rem]" data-audio-block>
        <AudioPlayer
          src={slide.src}
          duration={slide.duration}
          title={slide.title}
          showTitle={!hasSidePanel}
          options={slide.options}
          waveformUrl={slide.waveformUrl}
          waveformValue={slide.waveformValue}
          requiredStatement={slide.requiredStatement}
        />
        {/* Sibling of the player (never nested inside a button). */}
        <CanvasMetadataPopup enabled={props.metadataPopup !== false} />
      </div>
    </BaseExhibitionBlock>
  );
}

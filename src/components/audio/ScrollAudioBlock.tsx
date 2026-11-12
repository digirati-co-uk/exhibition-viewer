import { CanvasMetadataPopup } from "@/components/shared/CanvasMetadataPopup";
import { ScrollImageBlock } from "@/components/scroll/ScrollImageBlock";
import type { AudioThemeOptions } from "@/helpers/audio";
import { useOptionalScrollTheme } from "@/theme/scroll-theme";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import type { MediaStrategy } from "react-iiif-vault";
import { AudioPlayer } from "./AudioPlayer";
import { useAudioSlide } from "./use-audio-slide";

export interface ScrollAudioBlockProps {
  canvas: CanvasNormalized;
  strategy: MediaStrategy;
  index: number;
  id?: string;
  scrollEnabled?: boolean;
  audio?: Partial<AudioThemeOptions> | null;
}

/** The label/summary card sits top-left unless the canvas asks otherwise, leaving the bottom edge to the controls. */
function withAudioLayoutDefault(behavior: string[] = []) {
  const placed = behavior.some(
    (item) => item === "left" || item === "right" || item === "floating" || item.startsWith("float-")
  );
  return placed ? behavior : [...behavior, "float-top-left"];
}

/**
 * What a scroll audio section renders once it is on screen (the section itself only mounts it after its
 * IntersectionObserver fires). Must be inside the audio Canvas' CanvasContext. Exported so it can be rendered directly.
 */
export function ScrollAudioContent({
  canvas,
  strategy,
  audio,
}: Pick<ScrollAudioBlockProps, "canvas" | "strategy" | "audio">) {
  const slide = useAudioSlide(canvas, strategy, audio);
  const scrollTheme = useOptionalScrollTheme();
  const hasOverlay = Boolean(canvas.label || canvas.summary);

  return (
    <>
      <AudioPlayer
        src={slide.src}
        duration={slide.duration}
        title={slide.title}
        showTitle={!hasOverlay}
        options={slide.options}
        waveformUrl={slide.waveformUrl}
        waveformValue={slide.waveformValue}
        requiredStatement={slide.requiredStatement}
      />
      <CanvasMetadataPopup enabled={scrollTheme?.metadataPopup !== false} />
    </>
  );
}

/**
 * Audio slide for the scroll layout: a full-viewport section that plays inline (no dialog), reusing the image
 * section's label/summary overlay layout. Playback pauses once less than half the section is on screen.
 */
export function ScrollAudioBlock(props: ScrollAudioBlockProps) {
  const layoutBehavior = withAudioLayoutDefault(props.canvas.behavior);

  return (
    <ScrollImageBlock
      id={props.id}
      canvas={props.canvas}
      index={props.index}
      scrollEnabled={props.scrollEnabled}
      layoutBehavior={layoutBehavior}
      renderContent={() => <ScrollAudioContent canvas={props.canvas} strategy={props.strategy} audio={props.audio} />}
    />
  );
}

import { BaseSlide, type BaseSlideProps } from "@/components/shared/BaseSlide";
import { CanvasMetadataPopup } from "@/components/shared/CanvasMetadataPopup";
import { getFloatingFromBehaviours } from "@/helpers/exhibition";
import { useExhibition, useExhibitionStep } from "@/helpers/exhibition-store";
import { useStepDetails } from "@/helpers/use-step-details";
import type { FloatingPosition } from "@/theme/exhibition-theme";
import { LocaleString } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";
import { AudioPlayer } from "./AudioPlayer";
import type { AudioBlockProps } from "./AudioBlock";
import { useAudioSlide } from "./use-audio-slide";

const floatingPositionClass: Record<FloatingPosition, string> = {
  "top-left": "left-2 top-2",
  "top-right": "right-2 top-2",
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-2 right-2",
  top: "left-1/2 top-2 -translate-x-1/2",
  bottom: "bottom-2 left-1/2 -translate-x-1/2",
  left: "left-2 top-1/2 -translate-y-1/2",
  right: "right-2 top-1/2 -translate-y-1/2",
};

/**
 * Audio slide for presentation mode. The slide tells the player whether it is active, so audio pauses as soon as the
 * presentation moves on (or back) and - when autoplay is opted in - starts when the slide becomes the current step.
 * Label/summary placement mirrors the image slide layout. The required statement appears beneath the player label when its controls open, so the panel deliberately does not repeat it.
 */
export function AudioBlockPresentation(props: BaseSlideProps & Omit<AudioBlockProps, "id" | "scrollEnabled">) {
  const step = useExhibitionStep();
  const exhibition = useExhibition();
  const active = step?.canvasId === props.canvas.id;
  const slide = useAudioSlide(props.canvas, props.strategy, props.audio);
  const { isLeft, isBottom, isTop, showSummary, label, summary } = useStepDetails(props.canvas, null);
  const { isFloating, floatingPosition } = getFloatingFromBehaviours({ behavior: props.canvas.behavior || [] });

  return (
    <BaseSlide className="mb-8 bg-InfoBlock" index={props.index} active={active}>
      <div
        className={twMerge(
          "relative h-full md:flex",
          isLeft && "flex-row-reverse",
          isBottom && "flex-col",
          isTop && "flex-col-reverse"
        )}
      >
        <div
          className={twMerge(
            "cut-corners relative flex-1 md:w-2/3",
            (isBottom || isTop) && "w-full md:w-full",
            "aspect-square md:aspect-auto",
            !showSummary && "w-full md:w-full"
          )}
        >
          <AudioPlayer
            src={slide.src}
            duration={slide.duration}
            title={slide.title}
            showTitle={!showSummary}
            options={slide.options}
            waveformUrl={slide.waveformUrl}
            waveformValue={slide.waveformValue}
            requiredStatement={slide.requiredStatement}
            active={active}
            activationId={exhibition.stepVisit}
            onEnded={() => {
              if (active && exhibition.isPlaying) exhibition.nextStep(true);
            }}
          />
          {active ? <CanvasMetadataPopup enabled={props.metadataPopup !== false} /> : null}
        </div>

        {showSummary ? (
          <div
            className={twMerge(
              "cut-corners flex flex-col bg-InfoBlock text-InfoBlockText p-5 md:w-1/3",
              (isBottom || isTop) && "w-full md:w-full",
              active ? "opacity-100" : "opacity-0",
              isFloating && "absolute max-h-[calc(100%-1rem)] z-20",
              isFloating && floatingPositionClass[floatingPosition]
            )}
          >
            <div className="text-m mb-4 min-w-0 font-mono delft-title">
              <LocaleString>{label}</LocaleString>
            </div>
            <div className="exhibition-info-block overflow-y-auto">
              <LocaleString enableDangerouslySetInnerHTML className="whitespace-pre-wrap">
                {summary}
              </LocaleString>
            </div>
          </div>
        ) : null}
      </div>
    </BaseSlide>
  );
}

import type { MetadataItem } from "@iiif/presentation-3";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { type ResolvedAudioOptions } from "@/helpers/audio";
import { formatAudioTime, showAudioControls, showInitialPlayButton } from "@/helpers/audio-playback";
import { loadWaveformBars } from "@/helpers/audio-waveform";
import { AudioArtwork } from "./AudioArtwork";
import { AudioCredit } from "./AudioCredit";
import { AudioMutedGlyph, AudioPauseGlyph, AudioPlayGlyph, AudioReplayGlyph, AudioVolumeGlyph } from "./AudioIcons";
import { AudioSeekSlider } from "./AudioSeekSlider";
import { AudioWaveform, type WaveformStatus } from "./AudioWaveform";
import { useAudioPlayer } from "./use-audio-player";

export interface AudioPlayerProps {
  /** URL of the Sound body. */
  src: string;
  duration?: number;
  /** Slide title: names the play button and heads the controls. */
  title?: string;
  /** Show the title in the controls (hide it when a side panel already shows the label). */
  showTitle?: boolean;
  options: ResolvedAudioOptions;
  /** Optional pre-computed BBC peaks. */
  waveformUrl?: string | null;
  /** Inline BBC JSON from the waveform Dataset value. */
  waveformValue?: unknown;
  /**
   * The canvas' `requiredStatement`, revealed beneath the label when the controls open.
   */
  requiredStatement?: MetadataItem | null;
  /** Slide-driven activity (presentation). Omit to use on-screen visibility. */
  active?: boolean;
  /** A presentation traversal, including a loop back to this slide. */
  activationId?: number;
  className?: string;
  /** Replace the default artwork layer. */
  artwork?: ReactNode;
  onEnded?: () => void;
}

/**
 * The audio slide surface: artwork, a large play button, then (after the first play) a transport with a translucent
 * waveform, seek bar, time and volume. It always renders inline in the space it is given - there is deliberately no
 * fullscreen or modal mode.
 */
export function AudioPlayer({
  src,
  duration,
  title,
  showTitle = true,
  options,
  waveformUrl,
  waveformValue,
  requiredStatement,
  active,
  activationId,
  className,
  artwork,
  onEnded,
}: AudioPlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { state, mediaProps, toggle, seek, setVolume, toggleMute, retry, getProgress, isInView } = useAudioPlayer({
    duration,
    autoplay: options.autoplay,
    active,
    activationId,
    rootRef,
  });

  const hasBeenInView = useRef(false);
  if (isInView) hasBeenInView.current = true;
  const [wave, setWave] = useState<{ status: WaveformStatus; bars: Float32Array | null }>({
    status: "loading",
    bars: null,
  });

  // Fetch/decode the waveform lazily - only once the slide has actually been seen - and never fail loudly.
  const wantsWaveform = options.showWaveform && hasBeenInView.current;
  useEffect(() => {
    if (!wantsWaveform) return;
    const controller = new AbortController();
    setWave({ status: "loading", bars: null });
    loadWaveformBars({
      url: src,
      waveformUrl,
      waveformValue,
      duration,
      signal: controller.signal,
      onProgress: (bars) => {
        if (!controller.signal.aborted) setWave({ status: "loading", bars });
      },
    }).then(
      (bars) => setWave({ status: "ready", bars }),
      () => {
        if (!controller.signal.aborted) setWave({ status: "unavailable", bars: null });
      }
    );
    return () => controller.abort();
  }, [wantsWaveform, src, waveformUrl, waveformValue, duration]);

  const total = state.duration || duration || 0;
  const playing = state.status === "playing";
  const ended = state.status === "ended";
  const controlsVisible = showAudioControls(state);
  const label = title || "audio";
  const volume = state.muted ? 0 : state.volume;

  return (
    <div
      ref={rootRef}
      className={twMerge("exv-audio relative h-full w-full overflow-hidden bg-ViewerBackground", className)}
      style={{ "--exv-audio-wave-opacity": options.waveformOpacity } as CSSProperties}
      data-audio-state={state.status}
      data-audio-started={state.hasStarted}
      data-audio-autoplay-blocked={state.autoplayBlocked}
      data-audio-fit={options.imageFit}
      data-audio-has-credit={Boolean(requiredStatement)}
      data-audio-waveform={options.showWaveform ? wave.status : "off"}
    >
      {artwork ?? <AudioArtwork fit={options.imageFit} />}

      {/* biome-ignore lint/a11y/useMediaCaption: audio-only slides have no caption tracks */}
      <audio
        {...mediaProps}
        src={src}
        className="hidden"
        onEnded={() => {
          mediaProps.onEnded();
          onEnded?.();
        }}
      />

      {state.hasStarted && state.status !== "error" ? (
        <button
          type="button"
          className="exv-audio-surface"
          aria-label={playing ? `Pause ${label}` : ended ? `Replay ${label}` : `Play ${label}`}
          onClick={toggle}
        />
      ) : null}

      {showInitialPlayButton(state) ? (
        <button type="button" className="exv-audio-start" aria-label={`Play ${label}`} onClick={toggle}>
          <span className="exv-audio-start-disc">
            <AudioPlayGlyph />
          </span>
          <span className="exv-audio-start-meta">
            {total ? <span aria-hidden="true">{formatAudioTime(total)}</span> : null}
            {state.autoplayBlocked ? (
              <span className="exv-audio-start-hint">Autoplay was blocked by your browser. Press play to listen.</span>
            ) : null}
          </span>
        </button>
      ) : null}

      {/* Title and credit appear together when the audio controls open. */}
      <div
        className="exv-audio-controls"
        data-visible={controlsVisible}
        aria-hidden={!controlsVisible}
        inert={!controlsVisible}
      >
        {showTitle && title ? <div className="exv-audio-title">{title}</div> : null}
        {requiredStatement ? <AudioCredit statement={requiredStatement} /> : null}

        {options.showWaveform ? (
          <AudioWaveform
            bars={wave.bars}
            status={wave.status}
            getProgress={getProgress}
            playing={playing}
            time={state.time}
            onSeekFraction={(fraction) => total && seek(fraction * total)}
          />
        ) : null}

        <div className="exv-audio-transport">
          <button
            type="button"
            className="exv-audio-btn exv-audio-btn-primary"
            aria-label={playing ? "Pause" : ended ? "Replay" : "Play"}
            onClick={toggle}
          >
            {playing ? <AudioPauseGlyph /> : ended ? <AudioReplayGlyph /> : <AudioPlayGlyph />}
          </button>

          <span aria-hidden="true" className="min-w-[3ch] text-right">
            {formatAudioTime(state.time)}
          </span>

          <AudioSeekSlider
            duration={total}
            playing={playing}
            time={state.time}
            getProgress={getProgress}
            onSeek={seek}
          />

          <span aria-hidden="true" className="min-w-[3ch]">
            {formatAudioTime(total)}
          </span>

          <div className="exv-audio-volume">
            <button
              type="button"
              className="exv-audio-btn"
              aria-label={volume === 0 ? "Unmute" : "Mute"}
              aria-pressed={volume === 0}
              onClick={toggleMute}
            >
              {volume === 0 ? <AudioMutedGlyph /> : <AudioVolumeGlyph />}
            </button>
            <input
              type="range"
              className="exv-audio-range"
              aria-label="Volume"
              aria-valuetext={`${Math.round(volume * 100)} percent`}
              min={0}
              max={1}
              step={0.05}
              value={volume}
              style={{ "--exv-fill": `${volume * 100}%` } as CSSProperties}
              onChange={(event) => setVolume(Number(event.currentTarget.value))}
            />
          </div>
        </div>
      </div>

      {state.status === "error" ? (
        <div className="exv-audio-error" role="alert">
          <span className="flex-1">{state.error}</span>
          <button type="button" onClick={retry}>
            Try again
          </button>
        </div>
      ) : null}

      {/* Announce the blocked-autoplay fallback without moving focus. */}
      <span className="sr-only" role="status" aria-live="polite">
        {state.autoplayBlocked ? `Autoplay was blocked. Press play to listen to ${label}.` : ""}
      </span>
    </div>
  );
}

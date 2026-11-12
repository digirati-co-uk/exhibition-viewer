import { describeAudioTime } from "@/helpers/audio-playback";
import { useEffect, useRef } from "react";

interface AudioSeekSliderProps {
  duration: number;
  playing: boolean;
  /** React's less frequent time updates still refresh the paused slider and its accessible description. */
  time: number;
  getProgress: () => number;
  onSeek: (time: number) => void;
}

/** The thumb and fill share the waveform's media clock, rather than a rounded, throttled React value. */
export function AudioSeekSlider({ duration, playing, time, getProgress, onSeek }: AudioSeekSliderProps) {
  const input = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    let frame = 0;
    const paint = () => {
      const element = input.current;
      if (element && !dragging.current) {
        const progress = Math.min(1, Math.max(0, getProgress()));
        element.value = String(progress * duration);
        element.style.setProperty("--exv-fill", `${progress * 100}%`);
      }
    };
    const tick = () => {
      paint();
      frame = requestAnimationFrame(tick);
    };
    paint();
    if (playing) frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, getProgress, playing, time]);

  const seek = (value: number) => {
    const next = Math.min(duration, Math.max(0, value));
    const element = input.current;
    if (element) {
      element.value = String(next);
      element.style.setProperty("--exv-fill", `${duration ? (next / duration) * 100 : 0}%`);
    }
    onSeek(next);
  };

  return (
    <input
      ref={input}
      type="range"
      className="exv-audio-range"
      aria-label="Seek"
      aria-valuetext={`${describeAudioTime(time)} of ${describeAudioTime(duration)}`}
      min={0}
      max={duration || 0}
      step="any"
      defaultValue={0}
      disabled={!duration}
      onChange={(event) => seek(Number(event.currentTarget.value))}
      onPointerDown={(event) => {
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onLostPointerCapture={() => {
        dragging.current = false;
      }}
      onBlur={() => {
        dragging.current = false;
      }}
      onKeyDown={(event) => {
        // Keep useful keyboard increments while allowing fractional positions during playback and pointer scrubbing.
        const current = Number(event.currentTarget.value);
        const next = {
          ArrowLeft: current - 1,
          ArrowDown: current - 1,
          ArrowRight: current + 1,
          ArrowUp: current + 1,
          PageDown: current - 10,
          PageUp: current + 10,
          Home: 0,
          End: duration,
        }[event.key];
        if (next !== undefined) {
          event.preventDefault();
          seek(next);
        }
      }}
    />
  );
}

import { useEffect, useRef } from "react";

export type WaveformStatus = "loading" | "ready" | "unavailable";

interface AudioWaveformProps {
  /** Amplitude bins (0..1). Null while loading / when no waveform could be produced. */
  bars: Float32Array | null;
  status: WaveformStatus;
  /** Read each frame while playing so progress paints smoothly without re-rendering React. */
  getProgress: () => number;
  playing: boolean;
  /** Re-paint when the (throttled) React time changes, e.g. while paused and seeking. */
  time: number;
  onSeekFraction?: (fraction: number) => void;
}

const BAR_WIDTH = 3;
const BAR_GAP = 2;
/** Amplitude of the plain progress rail drawn when there is no waveform. */
const RAIL = 0.1;

function prefersReducedMotion() {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Semi-transparent bar waveform drawn on a canvas. The unplayed bars use the theme caption colour at reduced opacity;
 * the played bars use the theme accent/progress colour. When no waveform is available (still loading, CORS failure,
 * audio too long) a flat rail of the same bars is drawn so progress stays visible and nothing looks broken.
 *
 * It is decorative: seeking is exposed to assistive technology by the range input in the transport, this canvas just
 * offers pointer scrubbing.
 */
export function AudioWaveform({ bars, status, getProgress, playing, time, onSeekFraction }: AudioWaveformProps) {
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const colors = useRef({ played: "#facc15", unplayed: "#ffffff", opacity: 0.55 });
  const revealStart = useRef<number | null>(null);
  const dragging = useRef(false);
  const frame = useRef(0);
  const latest = useRef({ bars, status, getProgress, playing });
  latest.current = { bars, status, getProgress, playing };

  const draw = (now = performance.now()) => {
    const element = canvas.current;
    const holder = container.current;
    const context = element?.getContext("2d");
    if (!element || !holder || !context) return false;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = holder.clientWidth;
    const height = holder.clientHeight;
    if (!width || !height) return false;
    if (element.width !== Math.round(width * dpr) || element.height !== Math.round(height * dpr)) {
      element.width = Math.round(width * dpr);
      element.height = Math.round(height * dpr);
    }

    const { bars: data, getProgress: progress, status: current } = latest.current;
    const reveal =
      data && current === "ready" && !prefersReducedMotion()
        ? Math.min(1, (now - (revealStart.current ?? now)) / 600)
        : data
          ? 1
          : 0;
    const eased = 1 - (1 - reveal) ** 3;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    const count = Math.max(1, Math.floor((width + BAR_GAP) / (BAR_WIDTH + BAR_GAP)));
    const played = Math.min(1, Math.max(0, progress()));
    const middle = height / 2;
    context.lineCap = "round";
    context.lineWidth = BAR_WIDTH;

    for (let index = 0; index < count; index++) {
      const x = index * (BAR_WIDTH + BAR_GAP) + BAR_WIDTH / 2;
      let amplitude = RAIL;
      if (data) {
        // Take the loudest bin that falls under this bar so narrow peaks are not lost.
        const first = Math.floor((index / count) * data.length);
        const last = Math.max(first + 1, Math.floor(((index + 1) / count) * data.length));
        let peak = 0;
        for (let bin = first; bin < Math.min(data.length, last); bin++) peak = Math.max(peak, data[bin]!);
        amplitude = RAIL + (Math.max(RAIL, peak) - RAIL) * eased;
      }
      const half = Math.max(1.5, (height / 2) * amplitude);
      const isPlayed = (index + 0.5) / count <= played;
      context.globalAlpha = isPlayed ? 0.95 : colors.current.opacity;
      context.strokeStyle = isPlayed ? colors.current.played : colors.current.unplayed;
      context.beginPath();
      context.moveTo(x, middle - half);
      context.lineTo(x, middle + half);
      context.stroke();
    }
    context.globalAlpha = 1;
    return reveal < 1 && current === "ready";
  };

  const schedule = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame((now) => {
      const animating = draw(now);
      if (latest.current.playing || animating) schedule();
    });
  };

  // Resolve theme colours from CSS variables (canvas cannot read them directly).
  useEffect(() => {
    const holder = container.current;
    if (!holder) return;
    const style = getComputedStyle(holder);
    colors.current = {
      played: style.getPropertyValue("--exv-audio-played").trim() || "#facc15",
      unplayed: style.getPropertyValue("--exv-audio-unplayed").trim() || "#ffffff",
      opacity: Number.parseFloat(style.getPropertyValue("--exv-audio-wave-opacity")) || 0.55,
    };
    schedule();
  });

  useEffect(() => {
    // Progressive data is already revealed left to right; animate only an initially loaded complete waveform.
    if (bars && status === "loading") revealStart.current = 0;
    else if (bars && status === "ready" && revealStart.current !== 0) revealStart.current = performance.now();
    else if (!bars) revealStart.current = null;
    schedule();
  }, [bars, status]);

  useEffect(() => {
    schedule();
  }, [playing, time]);

  useEffect(() => {
    const holder = container.current;
    if (!holder || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(schedule);
    observer.observe(holder);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, []);

  const fraction = (clientX: number) => {
    const rect = container.current?.getBoundingClientRect();
    return rect?.width ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
  };

  return (
    <div
      ref={container}
      className="exv-audio-wave"
      aria-hidden="true"
      data-waveform={status}
      onPointerDown={(event) => {
        if (!onSeekFraction) return;
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        onSeekFraction(fraction(event.clientX));
      }}
      onPointerMove={(event) => {
        if (dragging.current) onSeekFraction?.(fraction(event.clientX));
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      <canvas ref={canvas} />
    </div>
  );
}

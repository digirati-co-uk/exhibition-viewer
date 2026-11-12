/**
 * Pure playback state for audio slides, so autoplay / error / visibility behaviour is testable without a DOM.
 */

export type AudioStatus = "idle" | "loading" | "playing" | "paused" | "ended" | "error";

export interface AudioPlaybackState {
  status: AudioStatus;
  /** True once the listener has started playback at least once; controls are revealed from then on. */
  hasStarted: boolean;
  /** Autoplay was requested but the browser refused it; the large play button stays and explains why. */
  autoplayBlocked: boolean;
  error: string | null;
  time: number;
  duration: number;
  volume: number;
  muted: boolean;
}

export type AudioPlaybackEvent =
  | { type: "loading" }
  | { type: "play" }
  | { type: "pause" }
  | { type: "ended" }
  | { type: "time"; time: number }
  | { type: "duration"; duration: number }
  | { type: "volume"; volume: number; muted: boolean }
  | { type: "autoplay-blocked" }
  | { type: "error"; message?: string };

export function createAudioPlaybackState(duration = 0, volume = 1, muted = false): AudioPlaybackState {
  return {
    status: "idle",
    hasStarted: false,
    autoplayBlocked: false,
    error: null,
    time: 0,
    duration: Number.isFinite(duration) && duration > 0 ? duration : 0,
    volume,
    muted,
  };
}

export function audioPlaybackReducer(state: AudioPlaybackState, event: AudioPlaybackEvent): AudioPlaybackState {
  switch (event.type) {
    case "loading":
      return state.status === "playing" || state.status === "error" ? state : { ...state, status: "loading" };
    case "play":
      return { ...state, status: "playing", hasStarted: true, autoplayBlocked: false, error: null };
    case "pause":
      // `pause` also fires right before `ended`; keep "ended" sticky.
      return state.status === "ended" || state.status === "error" ? state : { ...state, status: "paused" };
    case "ended":
      return { ...state, status: "ended", time: state.duration || state.time };
    case "time":
      return Number.isFinite(event.time) ? { ...state, time: Math.max(0, event.time) } : state;
    case "duration":
      return Number.isFinite(event.duration) && event.duration > 0 ? { ...state, duration: event.duration } : state;
    case "volume":
      return { ...state, volume: Math.min(1, Math.max(0, event.volume)), muted: event.muted };
    case "autoplay-blocked":
      return state.hasStarted ? state : { ...state, autoplayBlocked: true, status: "idle" };
    case "error":
      return {
        ...state,
        status: "error",
        error: event.message || "This audio could not be played.",
      };
  }
}

/** Large centre button is shown until playback has begun (and again if the audio failed before starting). */
export function showInitialPlayButton(state: AudioPlaybackState) {
  return !state.hasStarted && state.status !== "error";
}

export function showAudioControls(state: AudioPlaybackState) {
  return state.hasStarted && state.status !== "error";
}

export function formatAudioTime(seconds: number) {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}

/** Spoken form for aria-valuetext, e.g. "1 minute 5 seconds". */
export function describeAudioTime(seconds: number) {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const plural = (value: number, unit: string) => `${value} ${unit}${value === 1 ? "" : "s"}`;
  const parts = [hours ? plural(hours, "hour") : null, minutes ? plural(minutes, "minute") : null];
  if (secs || !parts.some(Boolean)) parts.push(plural(secs, "second"));
  return parts.filter(Boolean).join(" ");
}

/** Whether `play()` rejected because of the browser autoplay policy (rather than a real failure). */
export function isAutoplayBlockedError(error: unknown) {
  return !!error && typeof error === "object" && (error as { name?: string }).name === "NotAllowedError";
}

const MEDIA_ERROR_MESSAGES: Record<number, string> = {
  1: "Audio loading was cancelled.",
  2: "A network error stopped the audio from loading.",
  3: "This audio file could not be decoded.",
  4: "This audio format is not supported or the file could not be found.",
};

export function describeMediaError(code?: number | null) {
  return (code && MEDIA_ERROR_MESSAGES[code]) || "This audio could not be played.";
}

export function shouldPlayOnActivate(options: {
  autoplay: boolean;
  userPaused: boolean;
  hasEnded: boolean;
  replayEnded?: boolean;
}) {
  return options.autoplay && !options.userPaused && (!options.hasEnded || options.replayEnded === true);
}

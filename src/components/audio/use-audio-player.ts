import { type RefObject, useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  audioPlaybackReducer,
  createAudioPlaybackState,
  describeMediaError,
  isAutoplayBlockedError,
  shouldPlayOnActivate,
} from "@/helpers/audio-playback";

/** Volume is shared between audio slides so listeners do not have to re-set it on every slide. */
const sharedVolume = { volume: 1, muted: false };

/** Only one audio slide plays at a time (matters in the full-page grid, where several are on the page). */
let currentlyPlaying: HTMLAudioElement | null = null;

export interface UseAudioPlayerOptions {
  duration?: number;
  autoplay: boolean;
  /**
   * Slide-driven activity (presentation). When undefined the player is "active" while at least half of it is visible,
   * which covers the full-page grid, slideshow carousel and scroll layouts.
   */
  active?: boolean;
  activationId?: number;
  rootRef: RefObject<HTMLElement | null>;
}

function isHalfVisible(entry: IntersectionObserverEntry) {
  if (!entry.isIntersecting) return false;
  const viewport = entry.rootBounds?.height ?? (typeof window !== "undefined" ? window.innerHeight : 0);
  return entry.intersectionRatio >= 0.5 || (viewport > 0 && entry.intersectionRect.height >= viewport * 0.5);
}

export function useAudioPlayer({ duration, autoplay, active, activationId, rootRef }: UseAudioPlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, dispatch] = useReducer(audioPlaybackReducer, undefined, () =>
    createAudioPlaybackState(duration, sharedVolume.volume, sharedVolume.muted)
  );
  const [visible, setVisible] = useState(false);
  const userPaused = useRef(false);
  const hasEnded = useRef(false);

  const isInView = typeof active === "boolean" ? active : visible;

  // Visibility (only needed when the slide does not tell us whether it is active).
  useEffect(() => {
    const root = rootRef.current;
    if (typeof active === "boolean" || !root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => entry && setVisible(isHalfVisible(entry)), {
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [active, rootRef]);

  const play = useCallback(async (automatic = false) => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (hasEnded.current) {
        audio.currentTime = 0;
        hasEnded.current = false;
      }
      await audio.play();
    } catch (error) {
      if (isAutoplayBlockedError(error)) {
        // Autoplay policy: keep the big play button and explain. A deliberate click that fails is a real error.
        if (automatic) dispatch({ type: "autoplay-blocked" });
        else dispatch({ type: "error", message: "Your browser blocked playback. Try pressing play again." });
      } else if ((error as { name?: string })?.name !== "AbortError") {
        dispatch({ type: "error", message: describeMediaError(audio.error?.code) });
      }
    }
  }, []);

  const pause = useCallback(() => audioRef.current?.pause(), []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused || audio.ended) {
      userPaused.current = false;
      void play();
    } else {
      userPaused.current = true;
      audio.pause();
    }
  }, [play]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(time)) return;
    const length = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Infinity;
    audio.currentTime = Math.min(Math.max(0, time), length);
    hasEnded.current = false;
    dispatch({ type: "time", time: audio.currentTime });
  }, []);

  const setVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.muted = audio.volume === 0;
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.muted || audio.volume === 0) {
      audio.muted = false;
      if (audio.volume === 0) audio.volume = 0.6;
    } else {
      audio.muted = true;
    }
  }, []);

  const retry = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    userPaused.current = false;
    void play();
  }, [play]);

  // Leaving the slide / scrolling it away pauses; coming back resumes only when autoplay is opted in.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!isInView) {
      if (!audio.paused) audio.pause();
      return;
    }
    if (
      shouldPlayOnActivate({
        autoplay,
        userPaused: userPaused.current,
        hasEnded: hasEnded.current,
        replayEnded: active === true && activationId !== undefined,
      }) &&
      audio.paused
    ) {
      void play(true);
    }
  }, [isInView, autoplay, active, activationId, play]);

  // Initial volume + never leave audio playing after unmount.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = sharedVolume.volume;
    audio.muted = sharedVolume.muted;
    return () => {
      audio.pause();
      if (currentlyPlaying === audio) currentlyPlaying = null;
    };
  }, []);

  // Props for the <audio> element.
  const mediaProps = {
    ref: audioRef,
    preload: "metadata" as const,
    onLoadStart: () => dispatch({ type: "loading" }),
    onWaiting: () => dispatch({ type: "loading" }),
    onPlay: (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const audio = event.currentTarget;
      if (currentlyPlaying && currentlyPlaying !== audio) currentlyPlaying.pause();
      currentlyPlaying = audio;
      hasEnded.current = false;
      dispatch({ type: "play" });
    },
    onPause: (event: React.SyntheticEvent<HTMLAudioElement>) => {
      if (currentlyPlaying === event.currentTarget) currentlyPlaying = null;
      dispatch({ type: "pause" });
    },
    onEnded: () => {
      hasEnded.current = true;
      dispatch({ type: "ended" });
    },
    onTimeUpdate: (event: React.SyntheticEvent<HTMLAudioElement>) =>
      dispatch({ type: "time", time: event.currentTarget.currentTime }),
    onLoadedMetadata: (event: React.SyntheticEvent<HTMLAudioElement>) =>
      dispatch({ type: "duration", duration: event.currentTarget.duration }),
    onDurationChange: (event: React.SyntheticEvent<HTMLAudioElement>) =>
      dispatch({ type: "duration", duration: event.currentTarget.duration }),
    onVolumeChange: (event: React.SyntheticEvent<HTMLAudioElement>) => {
      const { volume, muted } = event.currentTarget;
      sharedVolume.volume = volume;
      sharedVolume.muted = muted;
      dispatch({ type: "volume", volume, muted });
    },
    onError: (event: React.SyntheticEvent<HTMLAudioElement>) =>
      dispatch({ type: "error", message: describeMediaError(event.currentTarget.error?.code) }),
  };

  const getProgress = useCallback(() => {
    const audio = audioRef.current;
    const length = audio && Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : duration || 0;
    return audio && length ? Math.min(1, audio.currentTime / length) : 0;
  }, [duration]);

  return {
    audioRef,
    state,
    mediaProps,
    play,
    pause,
    toggle,
    seek,
    setVolume,
    toggleMute,
    retry,
    getProgress,
    isInView,
  };
}

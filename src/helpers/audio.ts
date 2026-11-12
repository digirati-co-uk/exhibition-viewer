/**
 * Audio slide configuration.
 *
 * An "audio slide" is a Canvas painted with a standard IIIF `Sound` body (a `media` rendering strategy). Optionally an
 * `accompanyingCanvas` (or `placeholderCanvas`) supplies artwork.
 *
 * Configuration comes from two places, resolved in this order (last wins):
 *
 *   1. `theme.audio`                    - exhibition/preset level defaults (also `options.audio` on each viewer)
 *   2. canvas `behavior` values         - per slide overrides
 *
 * Canvas behaviors (all optional; last value in a pair wins):
 *
 *   audio                  marker only (Sound bodies are detected from the painting annotation)
 *   audio-waveform         show the waveform                 | no-audio-waveform  hide the waveform
 *   image-cover            artwork fills the slide (crops)   | image-contain      artwork letter-boxed (default)
 *   autoplay               start when the slide becomes active | no-autoplay      never autoplay
 *
 * Layout behaviors (`left`, `right`, `top`, `bottom`, `float-*`, ...) are shared with image slides.
 */

export type AudioImageFit = "contain" | "cover";

export interface AudioThemeOptions {
  /** Draw a semi-transparent waveform over the artwork. Default `true`. */
  showWaveform: boolean;
  /** How accompanying artwork is fitted. Default `"contain"`. */
  imageFit: AudioImageFit;
  /** Opt-in autoplay when the slide becomes active/visible. Default `false`. Browsers may still block it. */
  autoplay: boolean;
  /** Opacity (0-1) of the unplayed waveform bars. Default `0.55`. */
  waveformOpacity: number;
  /** Colour of the played portion (waveform, seek bar, play button). `null` = theme accent (`annotationSelected`). */
  progressColor: string | null;
  /** Colour of the unplayed waveform bars. `null` = theme `imageCaption` colour. */
  trackColor: string | null;
}

export const DEFAULT_AUDIO_THEME_OPTIONS: AudioThemeOptions = {
  showWaveform: true,
  imageFit: "contain",
  autoplay: false,
  waveformOpacity: 0.55,
  progressColor: null,
  trackColor: null,
};

export const AUDIO_BEHAVIORS = {
  audio: "audio",
  waveform: "audio-waveform",
  noWaveform: "no-audio-waveform",
  cover: "image-cover",
  contain: "image-contain",
  autoplay: "autoplay",
  noAutoplay: "no-autoplay",
} as const;

/** The resolved options a single audio slide renders with. */
export type ResolvedAudioOptions = Pick<
  AudioThemeOptions,
  "showWaveform" | "imageFit" | "autoplay" | "waveformOpacity"
>;

function clampOpacity(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

/** Last matching behavior wins so authors can append an override to a preset's behaviors. */
function lastOf(behavior: string[], values: string[]) {
  for (let index = behavior.length - 1; index >= 0; index--) {
    if (values.includes(behavior[index]!)) return behavior[index]!;
  }
  return null;
}

export function resolveAudioOptions(
  behavior: string[] | null | undefined,
  base?: Partial<AudioThemeOptions> | null,
): ResolvedAudioOptions {
  const behaviors = Array.isArray(behavior) ? behavior : [];
  const defaults = { ...DEFAULT_AUDIO_THEME_OPTIONS, ...(base || {}) };

  const waveform = lastOf(behaviors, [AUDIO_BEHAVIORS.waveform, AUDIO_BEHAVIORS.noWaveform]);
  const fit = lastOf(behaviors, [AUDIO_BEHAVIORS.cover, "cover", AUDIO_BEHAVIORS.contain, "contain"]);
  const autoplay = lastOf(behaviors, [AUDIO_BEHAVIORS.autoplay, AUDIO_BEHAVIORS.noAutoplay]);

  return {
    showWaveform: waveform ? waveform === AUDIO_BEHAVIORS.waveform : defaults.showWaveform !== false,
    imageFit: fit
      ? fit === AUDIO_BEHAVIORS.cover || fit === "cover"
        ? "cover"
        : "contain"
      : defaults.imageFit === "cover"
        ? "cover"
        : "contain",
    autoplay: autoplay ? autoplay === AUDIO_BEHAVIORS.autoplay : defaults.autoplay === true,
    waveformOpacity: clampOpacity(defaults.waveformOpacity, DEFAULT_AUDIO_THEME_OPTIONS.waveformOpacity),
  };
}

export function isAudioBehavior(behavior: string[] | null | undefined) {
  return !!behavior?.includes(AUDIO_BEHAVIORS.audio);
}

/** A `media` strategy whose painting body is a Sound. */
export function isSoundStrategy(strategy: { type?: string; media?: { type?: string } } | null | undefined) {
  return strategy?.type === "media" && strategy.media?.type === "Sound";
}

type ResourceLike = { id?: string; profile?: string | string[]; format?: string; label?: unknown; value?: unknown } | null | undefined;

const WAVEFORM_URL = /(?:\.dat|(?:waveform|peaks)\.json)(?:[?#]|$)/i;

/**
 * Optional pre-computed BBC `audiowaveform` peaks (`.dat` / `.json`) linked from `rendering` or `seeAlso`.
 * Using them avoids downloading + decoding the audio in the browser, and works for audio that is too long to decode
 * or served without CORS headers.
 */
export function findWaveformResource(...resources: Array<ResourceLike | ResourceLike[]>): ResourceLike {
  const all = resources.flat();
  // Editor-baked peaks supersede a previously linked authored waveform without deleting that link.
  const generated = all.find((resource) => resource && typeof resource.id === "string" &&
    (Array.isArray(resource.profile) ? resource.profile : [resource.profile]).includes("https://exhibitionviewer.org/profiles/generated-waveform"));
  if (generated?.id) return generated;
  for (const resource of all) {
    if (!resource || typeof resource.id !== "string") continue;
    const profile = Array.isArray(resource.profile) ? resource.profile.join(" ") : resource.profile || "";
    if (/waveform/i.test(profile) || WAVEFORM_URL.test(resource.id)) return resource;
  }
  return null;
}

/** URL-only compatibility helper for externally linked and legacy embedded datasets. */
export function findWaveformUrl(...resources: Array<ResourceLike | ResourceLike[]>): string | null {
  return findWaveformResource(...resources)?.id || null;
}

/** Full-file decoding bounds; long AAC/MP4 audio is sampled with bounded sequential byte windows instead. */
export const WAVEFORM_DECODE_LIMITS = { maxSeconds: 480, maxBytes: 24 * 1024 * 1024 };

export function canDecodeWaveform(duration: number | null | undefined) {
  return !duration || duration <= WAVEFORM_DECODE_LIMITS.maxSeconds;
}

/**
 * Waveform data for audio slides.
 *
 * Adapted from the Theseus viewer (`helpers/audio-waveform.ts`): BBC `audiowaveform` v1/v2 peak parsing and a bounded
 * client-side decode fallback. Everything degrades gracefully: any failure (no CORS headers, unsupported codec, audio
 * too long, aborted) rejects and the player simply draws a plain progress rail instead.
 */
import { WAVEFORM_DECODE_LIMITS } from "./audio";

/** Number of amplitude bins we store per waveform; the canvas resamples to however many bars fit. */
export const WAVEFORM_BINS = 480;

export interface WaveformPeaks {
  sampleRate: number;
  samplesPerPixel: number;
  /** Interleaved min/max in the range -1..1. */
  peaks: Float32Array;
  /** Sampled AAC windows are approximate, with a contiguous prefix available while loading. */
  approximate?: boolean;
  progress?: number;
}

/** BBC audiowaveform v1/v2, JSON or little-endian `.dat`, folded to a mono envelope. */
export function parseWaveformPeaks(buffer: ArrayBuffer): WaveformPeaks {
  const bytes = new Uint8Array(buffer);
  const isJson = [9, 10, 13, 32, 123].includes(bytes[0] || 0);
  let version: number;
  let bits: number;
  let sampleRate: number;
  let scale: number;
  let length: number;
  let channels: number;
  let read: (index: number) => number;

  if (isJson) {
    const json = JSON.parse(new TextDecoder().decode(buffer));
    ({ version, bits, sample_rate: sampleRate, samples_per_pixel: scale, length } = json);
    channels = version === 1 ? 1 : json.channels;
    if (!Array.isArray(json.data) || json.data.length !== length * channels * 2) {
      throw new Error("Invalid waveform data length");
    }
    read = (index) => json.data[index];
  } else {
    if (buffer.byteLength < 20) throw new Error("Invalid waveform header");
    const view = new DataView(buffer);
    version = view.getInt32(0, true);
    bits = view.getUint32(4, true) & 1 ? 8 : 16;
    sampleRate = view.getInt32(8, true);
    scale = view.getInt32(12, true);
    length = view.getUint32(16, true);
    if (version === 2 && buffer.byteLength < 24) throw new Error("Invalid waveform header");
    channels = version === 1 ? 1 : view.getInt32(20, true);
    const offset = version === 1 ? 20 : 24;
    if (buffer.byteLength !== offset + length * channels * 2 * (bits / 8)) {
      throw new Error("Invalid waveform data length");
    }
    read = (index) => (bits === 8 ? view.getInt8(offset + index) : view.getInt16(offset + index * 2, true));
  }

  if (
    ![1, 2].includes(version) ||
    ![8, 16].includes(bits) ||
    !Number.isInteger(length) ||
    length < 1 ||
    !Number.isInteger(channels) ||
    channels < 1 ||
    channels > 32 ||
    !Number.isFinite(sampleRate) ||
    sampleRate <= 0 ||
    !Number.isFinite(scale) ||
    scale <= 0 ||
    length > 5_000_000
  ) {
    throw new Error("Invalid waveform format");
  }

  const peaks = new Float32Array(length * 2);
  const divisor = 2 ** (bits - 1);
  for (let index = 0; index < length; index++) {
    let min = 0;
    let max = 0;
    for (let channel = 0; channel < channels; channel++) {
      const lo = read((index * channels + channel) * 2);
      const hi = read((index * channels + channel) * 2 + 1);
      if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo > hi) throw new Error("Invalid waveform peak");
      min = Math.min(min, lo / divisor);
      max = Math.max(max, hi / divisor);
    }
    peaks[index * 2] = Math.max(-1, min);
    peaks[index * 2 + 1] = Math.min(1, max);
  }
  return { sampleRate, samplesPerPixel: scale, peaks };
}

/**
 * Reduce min/max peaks to `count` amplitude bins (0..1). Display gain only: robust 98th-percentile normalisation with
 * a gentle power curve, and a floor so near-silence never becomes a wall of noise. Exact silence stays at zero.
 */
export function peaksToAmplitudeBars(peaks: Float32Array, count = WAVEFORM_BINS): Float32Array {
  const bins = Math.max(1, Math.round(count));
  const source = Math.floor(peaks.length / 2);
  const bars = new Float32Array(bins);
  if (source < 1) return bars;

  for (let bin = 0; bin < bins; bin++) {
    const first = Math.floor((bin / bins) * source);
    const last = Math.max(first + 1, Math.ceil(((bin + 1) / bins) * source));
    let amplitude = 0;
    for (let pixel = first; pixel < Math.min(source, last); pixel++) {
      const lo = peaks[pixel * 2] || 0;
      const hi = peaks[pixel * 2 + 1] || 0;
      amplitude = Math.max(amplitude, Math.abs(lo), Math.abs(hi));
    }
    bars[bin] = Number.isFinite(amplitude) ? amplitude : 0;
  }

  const nonZero = Array.from(bars)
    .filter((value) => value > 0)
    .sort((a, b) => a - b);
  if (!nonZero.length) return bars;
  const reference = Math.max(1 / 32, nonZero[Math.ceil((nonZero.length - 1) * 0.98)] ?? 1);
  return Float32Array.from(bars, (value) => (value > 0 ? Math.min(1, (value / reference) ** 0.8) * 0.96 : 0));
}

async function readLimited(response: Response, maxBytes: number): Promise<ArrayBuffer> {
  if (!response.ok) throw new Error(`Waveform source unavailable (${response.status})`);
  if (Number(response.headers.get("content-length")) > maxBytes) throw new Error("Waveform source too large");
  const reader = response.body?.getReader();
  if (!reader) return response.arrayBuffer();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error("Waveform source too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result.buffer;
}

async function decodeAudioPeaks(url: string, signal: AbortSignal, duration?: number): Promise<WaveformPeaks> {
  if (duration && duration > WAVEFORM_DECODE_LIMITS.maxSeconds) {
    throw new Error("Audio is too long to generate a waveform in the browser");
  }
  const Offline: typeof OfflineAudioContext | undefined =
    typeof OfflineAudioContext !== "undefined" ? OfflineAudioContext : (globalThis as any).webkitOfflineAudioContext;
  if (!Offline) throw new Error("Audio decoding is unsupported");

  // Cross-origin audio without CORS headers rejects here; the caller treats that as "no waveform".
  const buffer = await readLimited(
    await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]) }),
    WAVEFORM_DECODE_LIMITS.maxBytes,
  );
  signal.throwIfAborted();
  const decoded = await new Offline(1, 1, 8000).decodeAudioData(buffer);
  signal.throwIfAborted();
  if (decoded.duration > WAVEFORM_DECODE_LIMITS.maxSeconds) {
    throw new Error("Audio is too long to generate a waveform in the browser");
  }

  const scale = Math.max(1, Math.round(decoded.sampleRate / 50));
  const peaks = new Float32Array(Math.ceil(decoded.length / scale) * 2);
  for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
    const data = decoded.getChannelData(channel);
    for (let sample = 0; sample < data.length; sample++) {
      const pixel = Math.floor(sample / scale) * 2;
      peaks[pixel] = Math.min(peaks[pixel]!, data[sample]!);
      peaks[pixel + 1] = Math.max(peaks[pixel + 1]!, data[sample]!);
    }
  }
  return { sampleRate: decoded.sampleRate, samplesPerPixel: scale, peaks };
}

/** Generate real decoded peaks, using bounded AAC windows for long recordings. */
export async function generateWaveformPeaks(
  url: string,
  { signal = new AbortController().signal, duration, onProgress }: {
    signal?: AbortSignal;
    duration?: number;
    onProgress?: (peaks: WaveformPeaks) => void;
  } = {},
): Promise<WaveformPeaks> {
  signal.throwIfAborted();
  if (typeof AudioDecoder !== "undefined" && /\.(?:m4a|mp4|m4b)(?:[?#]|$)/i.test(url)) {
    try {
      const { sampleMp4Waveform } = await import("./audio-waveform-ranges");
      return await sampleMp4Waveform(url, signal, (peaks) => onProgress?.(peaks));
    } catch {
      signal.throwIfAborted();
      // Short sources can still be fully decoded when ranges, codecs or indexing are unsupported.
    }
  }
  const waveform = await decodeAudioPeaks(url, signal, duration);
  // Publish decoded bins in order too: no invented/random peaks, and never fill the right before the left.
  const partial = new Float32Array(waveform.peaks.length).fill(Number.NaN);
  const count = waveform.peaks.length / 2;
  const batch = Math.max(1, Math.ceil(count / 32));
  for (let first = 0; first < count; first += batch) {
    signal.throwIfAborted();
    const end = Math.min(count, first + batch);
    partial.set(waveform.peaks.subarray(first * 2, end * 2), first * 2);
    onProgress?.({ ...waveform, peaks: partial.slice(), progress: end / count });
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  return { ...waveform, progress: 1 };
}

interface CachedWaveform {
  promise: Promise<Float32Array>;
  controller: AbortController;
  listeners: Set<(bars: Float32Array, progress: number) => void>;
  bars?: Float32Array;
  progress?: number;
}
const cache = new Map<string, CachedWaveform>();
const MAX_CACHED = 12;

export interface LoadWaveformOptions {
  /** The audio file. */
  url: string;
  /** Optional pre-computed BBC peaks (preferred), including editor-baked data URLs. */
  waveformUrl?: string | null;
  /** BBC audiowaveform JSON embedded in a Dataset value (object or JSON string). */
  waveformValue?: unknown;
  duration?: number;
  signal?: AbortSignal;
  /** Prefix measurements in recording order. Unmeasured bins remain a plain progress rail. */
  onProgress?: (bars: Float32Array, progress: number) => void;
}

/** Amplitude bars (`WAVEFORM_BINS`, 0..1) for an audio file; rejects when no waveform can be produced. */
export function loadWaveformBars({ url, waveformUrl, waveformValue, duration, signal, onProgress }: LoadWaveformOptions): Promise<Float32Array> {
  if (signal?.aborted) return Promise.reject(signal.reason);
  // Inline values can change while a dataset keeps its ID (regeneration in the editor).
  const inline = waveformValue == null ? null : typeof waveformValue === "string" ? waveformValue : JSON.stringify(waveformValue);
  const key = inline == null ? waveformUrl || url : `${waveformUrl || url}\n${inline}`;
  let entry = cache.get(key);
  if (entry) {
    cache.delete(key);
    cache.set(key, entry);
  } else {
    const controller = new AbortController();
    const created: CachedWaveform = {
      controller,
      listeners: new Set(),
      promise: null as unknown as Promise<Float32Array>,
    };
    created.promise = (async () => {
      if (inline != null) {
        try {
          return peaksToAmplitudeBars(parseWaveformPeaks(new TextEncoder().encode(inline).buffer).peaks);
        } catch {
          controller.signal.throwIfAborted();
          // Invalid embedded peaks fall back to sampling/decoding the recording.
        }
      }
      if (waveformUrl && inline == null) {
        try {
          const buffer = await readLimited(
            await fetch(waveformUrl, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) }),
            WAVEFORM_DECODE_LIMITS.maxBytes,
          );
          return peaksToAmplitudeBars(parseWaveformPeaks(buffer).peaks);
        } catch {
          controller.signal.throwIfAborted();
        }
      }
      const peaks = await generateWaveformPeaks(url, {
        signal: controller.signal,
        duration,
        onProgress(peaks) {
          created.bars = peaksToAmplitudeBars(peaks.peaks);
          created.progress = peaks.progress || 0;
          for (const notify of created.listeners) notify(created.bars, created.progress);
        },
      });
      return peaksToAmplitudeBars(peaks.peaks);
    })();
    created.promise.catch(() => {
      if (cache.get(key) === created) cache.delete(key);
    });
    cache.set(key, created);
    while (cache.size > MAX_CACHED) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.get(oldest)?.controller.abort();
      cache.delete(oldest);
    }
    entry = created;
  }
  const shared = entry;
  if (onProgress) {
    shared.listeners.add(onProgress);
    if (shared.bars) onProgress(shared.bars, shared.progress || 0);
  }

  return new Promise<Float32Array>((resolve, reject) => {
    const cleanup = () => {
      signal?.removeEventListener("abort", abort);
      if (onProgress) shared.listeners.delete(onProgress);
    };
    const abort = () => { cleanup(); reject(signal?.reason); };
    signal?.addEventListener("abort", abort, { once: true });
    shared.promise.then(
      (value) => { cleanup(); if (!signal?.aborted) resolve(value); },
      (error) => { cleanup(); if (!signal?.aborted) reject(error); },
    );
  });
}

/** Test seam. */
export function clearWaveformCache() {
  for (const value of cache.values()) value.controller.abort();
  cache.clear();
}

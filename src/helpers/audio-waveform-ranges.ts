import { createFile, type Movie, type ES_Descriptor, type MP4BoxBuffer } from "mp4box";
import type { WaveformPeaks } from "./audio-waveform";

const BINS = 256;
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_METADATA = 2 * 1024 * 1024;
const MAX_WINDOW = 64 * 1024;

/** Measure from the beginning, publishing only a contiguous prefix of the recording. */
export function waveformSampleOrder(count = BINS): number[] {
  return Array.from({ length: count }, (_, index) => index);
}

/** An approximate envelope from short AAC windows, never a full audio download. */
export async function sampleMp4Waveform(url: string, signal: AbortSignal, onProgress: (waveform: WaveformPeaks) => void): Promise<WaveformPeaks> {
  if (typeof AudioDecoder === "undefined") throw new Error("Audio sampling is unsupported");
  let bytes = 0;
  const read = async (start: number, size: number) => {
    signal.throwIfAborted();
    if (!Number.isSafeInteger(start) || start < 0 || size < 1 || size > MAX_METADATA || bytes + size > MAX_BYTES) {
      throw new Error("Waveform sampling budget exceeded");
    }
    // Reserve before fetching so concurrent windows cannot overrun the budget.
    bytes += size;
    const response = await fetch(url, {
      headers: { Range: `bytes=${start}-${start + size - 1}` },
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    });
    if (response.status !== 206) {
      await response.body?.cancel();
      throw new Error("Audio server does not support byte ranges");
    }
    const range = response.headers.get("content-range");
    if (range && !range.startsWith(`bytes ${start}-`)) {
      await response.body?.cancel();
      throw new Error("Audio server returned the wrong byte range");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Audio source unavailable");
    const result = new Uint8Array(size);
    let length = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (length + value.length > size) throw new Error("Audio server exceeded the requested byte range");
        result.set(value, length);
        length += value.length;
      }
    } finally { await reader.cancel().catch(() => {}); }
    return result.subarray(0, length);
  };

  // Walk top-level box headers, jumping over mdat even when moov is at the end of the file.
  let offset = 0;
  let moov: Uint8Array | undefined;
  let ftyp: Uint8Array | undefined;
  const first = await read(0, 64 * 1024);
  for (let boxes = 0; boxes < 64; boxes++) {
    const header = offset + 16 <= first.length ? first.subarray(offset) : await read(offset, 16);
    if (header.length < 8) throw new Error("Incomplete MP4 metadata");
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
    const size32 = view.getUint32(0);
    const size = size32 === 1 ? Number(view.getBigUint64(8)) : size32;
    const type = String.fromCharCode(...header.subarray(4, 8));
    if (!Number.isSafeInteger(size) || size < (size32 === 1 ? 16 : 8)) throw new Error("Invalid MP4 box");
    if (type === "moov" || type === "ftyp") {
      if (size > MAX_METADATA) throw new Error("MP4 metadata is too large");
      const data = offset + size <= first.length ? first.subarray(offset, offset + size) : await read(offset, size);
      if (data.length !== size) throw new Error("Incomplete MP4 metadata");
      if (type === "moov") { moov = data; break; }
      ftyp = data;
    }
    offset += size;
  }
  if (!moov) throw new Error("MP4 has no usable timing index");
  const metadata = new Uint8Array((ftyp?.length || 0) + moov.length);
  if (ftyp) metadata.set(ftyp);
  metadata.set(moov, ftyp?.length || 0);
  const file = createFile();
  let movie: Movie | undefined;
  file.onReady = (info) => { movie = info; };
  file.onError = () => { throw new Error("Invalid MP4 metadata"); };
  file.appendBuffer(Object.assign(metadata.buffer, { fileStart: 0 }) as MP4BoxBuffer);
  if (!movie || movie.isFragmented) throw new Error("MP4 has no usable timing index");
  const track = movie.audioTracks.find((candidate) => candidate.codec.startsWith("mp4a.40."));
  const samples = track && file.getTrackSamplesInfo(track.id);
  if (!track?.audio || !samples?.length) throw new Error("MP4 has no supported AAC track");
  const description = samples[0]!.description as { esds?: { esd: ES_Descriptor } };
  const configBytes: unknown = description.esds?.esd.findDescriptor(4)?.findDescriptor(5)?.data;
  if (!(configBytes instanceof Uint8Array)) throw new Error("Missing AAC configuration");
  const config: AudioDecoderConfig = {
    codec: track.codec, sampleRate: track.audio.sample_rate, numberOfChannels: track.audio.channel_count,
    description: Uint8Array.from(configBytes),
  };
  if (!(await AudioDecoder.isConfigSupported(config)).supported) throw new Error("AAC sampling is unsupported");
  // Respect the common single edit that removes encoder priming. Complex edits need authored peaks.
  if (track.edits && (track.edits.length > 1 || track.edits.some((edit) => edit.media_time < 0))) {
    throw new Error("MP4 edit list is unsupported for sampled waveforms");
  }
  const mediaStart = (track.edits?.[0]?.media_time || 0) / track.timescale;
  const duration = track.movie_duration / track.movie_timescale;
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("Invalid audio duration");
  const waveform: WaveformPeaks = {
    sampleRate: BINS / duration, samplesPerPixel: 1,
    peaks: new Float32Array(BINS * 2).fill(Number.NaN), approximate: true, progress: 0,
  };
  let completed = 0;
  const sampleAt = (time: number) => {
    let lo = 0, hi = samples.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (samples[mid]!.cts / samples[mid]!.timescale < time) lo = mid + 1;
      else hi = mid;
    }
    return Math.min(lo, samples.length - 1);
  };
  const measure = async (bin: number) => {
    const time = mediaStart + bin / BINS * duration;
    const from = Math.max(0, sampleAt(time) - 3); // Warm up AAC overlap before measuring.
    const to = Math.min(samples.length, sampleAt(time + 0.3) + 1);
    const window = samples.slice(from, to);
    const start = window[0]!.offset;
    const end = Math.max(...window.map((sample) => sample.offset + sample.size));
    if (end - start > MAX_WINDOW) throw new Error("Audio sampling window is too large");
    const data = await read(start, end - start);
    let min = 0, max = 0, frames = 0;
    let decoderError: Error | undefined;
    const decoder = new AudioDecoder({
      error: (error) => { decoderError = error; },
      output: (audio) => {
        try {
          const skip = Math.max(0, Math.ceil((time - audio.timestamp / 1e6) * audio.sampleRate));
          if (skip >= audio.numberOfFrames) return;
          const values = new Float32Array(audio.numberOfFrames);
          for (let channel = 0; channel < audio.numberOfChannels; channel++) {
            audio.copyTo(values, { planeIndex: channel, format: "f32-planar" });
            for (let i = skip; i < values.length; i++) { min = Math.min(min, values[i]!); max = Math.max(max, values[i]!); }
          }
          frames += audio.numberOfFrames - skip;
        } finally { audio.close(); }
      },
    });
    try {
      decoder.configure(config);
      for (const sample of window) {
        signal.throwIfAborted();
        if (sample.description_index !== samples[0]!.description_index) throw new Error("AAC configuration changes within the recording");
        const begin = sample.offset - start;
        if (begin < 0 || begin + sample.size > data.length) throw new Error("Incomplete audio sampling window");
        decoder.decode(new EncodedAudioChunk({ type: "key", timestamp: Math.round(sample.cts / sample.timescale * 1e6), data: data.subarray(begin, begin + sample.size) }));
      }
      await decoder.flush();
      if (decoderError) throw decoderError;
      if (!frames) throw new Error("No audio frames decoded");
    } finally { if (decoder.state !== "closed") decoder.close(); }
    waveform.peaks[bin * 2] = min;
    waveform.peaks[bin * 2 + 1] = max;
    waveform.progress = ++completed / BINS;
  };
  for (const bin of waveformSampleOrder()) {
    signal.throwIfAborted();
    try {
      await measure(bin);
    } catch (error) {
      signal.throwIfAborted();
      // Retain useful measurements after an intermittent failure, with unmeasured bins visibly empty.
      if (!completed) throw error;
      break;
    }
    signal.throwIfAborted();
    onProgress({ ...waveform, peaks: waveform.peaks.slice() });
  }
  return waveform;
}

import { readFileSync } from "node:fs";
import { afterEach, expect, test } from "bun:test";
import { sampleMp4Waveform, waveformSampleOrder } from "../src/helpers/audio-waveform-ranges";

const originals = { fetch: globalThis.fetch, AudioDecoder: (globalThis as any).AudioDecoder, EncodedAudioChunk: (globalThis as any).EncodedAudioChunk };
afterEach(() => Object.assign(globalThis, originals));

test("sample order starts at the beginning and proceeds left to right", () => {
  expect(waveformSampleOrder(8)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
});

test("AAC byte windows publish a contiguous prefix, never fabricated values on the right", async () => {
  const file = readFileSync(new URL("./fixtures/tone.m4a", import.meta.url));
  const requests: number[][] = [];
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    const [start, end] = new Headers(init.headers).get("range")!.match(/\d+/g)!.map(Number) as [number, number];
    requests.push([start, end]);
    return new Response(new Uint8Array(file.subarray(start, end + 1)), { status: 206, headers: { "content-range": `bytes ${start}-${Math.min(end, file.length - 1)}/${file.length}` } });
  }) as typeof fetch;
  (globalThis as any).EncodedAudioChunk = class { constructor(init: object) { Object.assign(this, init); } };
  (globalThis as any).AudioDecoder = class {
    static async isConfigSupported() { return { supported: true }; }
    state = "configured";
    sampleRate = 44100;
    constructor(private callbacks: AudioDecoderInit) {}
    configure(config: AudioDecoderConfig) { this.sampleRate = config.sampleRate; }
    decode(chunk: EncodedAudioChunk) {
      this.callbacks.output({ timestamp: chunk.timestamp, sampleRate: this.sampleRate, numberOfFrames: 1024, numberOfChannels: 1,
        copyTo: (values: Float32Array) => values.fill(0.4), close() {},
      } as unknown as AudioData);
    }
    async flush() {}
    close() { this.state = "closed"; }
  };
  const snapshots: Array<{ progress: number; peaks: Float32Array }> = [];
  const result = await sampleMp4Waveform("https://example.org/tone.m4a", new AbortController().signal, (waveform) => {
    snapshots.push({ progress: waveform.progress!, peaks: waveform.peaks.slice() });
  });
  expect(snapshots.length).toBe(256);
  snapshots.forEach((snapshot, index) => {
    expect(snapshot.progress).toBe((index + 1) / 256);
    expect([...snapshot.peaks.slice(0, (index + 1) * 2)].every(Number.isFinite)).toBe(true);
    expect([...snapshot.peaks.slice((index + 1) * 2)].every(Number.isNaN)).toBe(true);
  });
  expect(result.progress).toBe(1);
  expect(result.approximate).toBe(true);
  expect(requests.length).toBe(257);
  // All media reads follow the audio timeline, unlike the old distributed/random sampling pass.
  expect(requests.slice(1).map(([start]) => start)).toEqual(requests.slice(1).map(([start]) => start).sort((a, b) => a! - b!));
  expect(Math.max(...requests.slice(1).map(([start, end]) => end! - start! + 1))).toBeLessThanOrEqual(64 * 1024);
});

test("ignored byte ranges are cancelled before downloading the entire recording", async () => {
  (globalThis as any).AudioDecoder = class {};
  let cancelled = false;
  globalThis.fetch = (async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status: 200 })) as typeof fetch;
  await expect(sampleMp4Waveform("https://example.org/no-ranges.mp4", new AbortController().signal, () => {})).rejects.toThrow("byte ranges");
  expect(cancelled).toBe(true);
});

test("oversized timing metadata is rejected before fetching it", async () => {
  (globalThis as any).AudioDecoder = class {};
  const header = new Uint8Array(16);
  new DataView(header.buffer).setUint32(0, 3 * 1024 * 1024);
  header.set(new TextEncoder().encode("moov"), 4);
  let requests = 0;
  globalThis.fetch = (async () => { requests++; return new Response(header, { status: 206 }); }) as typeof fetch;
  await expect(sampleMp4Waveform("https://example.org/large-index.mp4", new AbortController().signal, () => {})).rejects.toThrow("metadata is too large");
  expect(requests).toBe(1);
});

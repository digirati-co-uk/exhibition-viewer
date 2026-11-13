import { afterEach, describe, expect, test } from "bun:test";
import {
  WAVEFORM_BINS,
  clearWaveformCache,
  loadWaveformBars,
  generateWaveformPeaks,
  parseWaveformPeaks,
  peaksToAmplitudeBars,
} from "../src/helpers/audio-waveform";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  clearWaveformCache();
});

function peaksJson(data: number[], extra: Record<string, unknown> = {}) {
  return new TextEncoder().encode(
    JSON.stringify({
      version: 2,
      channels: 1,
      sample_rate: 2000,
      samples_per_pixel: 2000,
      bits: 8,
      length: data.length / 2,
      data,
      ...extra,
    }),
  ).buffer as ArrayBuffer;
}

describe("waveform peaks", () => {
  test("parses BBC audiowaveform JSON", () => {
    const peaks = parseWaveformPeaks(peaksJson([-64, 64, -128, 127, 0, 0]));
    expect(peaks.sampleRate).toBe(2000);
    expect(peaks.samplesPerPixel).toBe(2000);
    expect(Array.from(peaks.peaks)).toEqual([-0.5, 0.5, -1, 127 / 128, 0, 0]);
  });

  test("parses BBC audiowaveform v2 binary (.dat)", () => {
    const buffer = new ArrayBuffer(24 + 2 * 2);
    const view = new DataView(buffer);
    view.setInt32(0, 2, true); // version
    view.setUint32(4, 1, true); // flags: 8 bit
    view.setInt32(8, 44100, true);
    view.setInt32(12, 256, true);
    view.setUint32(16, 2, true); // length
    view.setInt32(20, 1, true); // channels
    [-32, 32, -16, 16].forEach((value, index) => view.setInt8(24 + index, value));
    const peaks = parseWaveformPeaks(buffer);
    expect(peaks.sampleRate).toBe(44100);
    expect(Array.from(peaks.peaks)).toEqual([-0.25, 0.25, -0.125, 0.125]);
  });

  test("rejects malformed data", () => {
    expect(() => parseWaveformPeaks(peaksJson([1, 2, 3, 4], { length: 5 }))).toThrow();
    expect(() => parseWaveformPeaks(peaksJson([5, 1]))).toThrow(); // min > max
    expect(() => parseWaveformPeaks(peaksJson([-1, 1], { bits: 12 }))).toThrow();
    expect(() => parseWaveformPeaks(new ArrayBuffer(4))).toThrow();
  });

  test("reduces peaks to normalised amplitude bars", () => {
    const peaks = new Float32Array([-0.1, 0.1, -0.2, 0.2, -0.4, 0.4, 0, 0]);
    const bars = peaksToAmplitudeBars(peaks, 4);
    expect(bars.length).toBe(4);
    expect(bars[3]).toBe(0); // exact silence stays silent
    expect(bars[2]!).toBeGreaterThan(bars[1]!);
    expect(bars[1]!).toBeGreaterThan(bars[0]!);
    for (const value of bars) expect(value).toBeLessThanOrEqual(0.96 + 1e-6);
  });

  test("handles empty and silent input", () => {
    expect(peaksToAmplitudeBars(new Float32Array(), 8)).toEqual(new Float32Array(8));
    expect(Array.from(peaksToAmplitudeBars(new Float32Array(8), 2))).toEqual([0, 0]);
  });
});

describe("loading waveforms", () => {
  test("uses pre-computed peaks when linked, without touching the audio file", async () => {
    const requested: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      requested.push(String(input));
      return new Response(peaksJson([-64, 64, -32, 32]));
    }) as typeof fetch;

    const bars = await loadWaveformBars({
      url: "https://audio.example.org/a.mp4",
      waveformUrl: "https://audio.example.org/a.peaks.json",
      duration: 4000,
    });
    expect(bars.length).toBe(WAVEFORM_BINS);
    expect(requested).toEqual(["https://audio.example.org/a.peaks.json"]);
  });

  test("shares one load between callers and caches the result", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response(peaksJson([-64, 64]));
    }) as typeof fetch;
    const options = { url: "https://audio.example.org/b.mp4", waveformUrl: "https://audio.example.org/b.dat" };
    const [first, second] = await Promise.all([loadWaveformBars(options), loadWaveformBars(options)]);
    await loadWaveformBars(options);
    expect(calls).toBe(1);
    expect(first).toBe(second);
  });

  test("a CORS / network failure rejects (the player then shows a plain rail) and is not cached", async () => {
    let calls = 0;
    (globalThis as any).OfflineAudioContext = class {
      decodeAudioData() {
        throw new Error("unreachable");
      }
    };
    globalThis.fetch = (async () => {
      calls++;
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;

    try {
      await expect(loadWaveformBars({ url: "https://no-cors.example.org/a.mp3", duration: 30 })).rejects.toBeDefined();
      await expect(loadWaveformBars({ url: "https://no-cors.example.org/a.mp3", duration: 30 })).rejects.toBeDefined();
      expect(calls).toBe(2);
    } finally {
      // biome-ignore lint/performance/noDelete: restoring the global
      delete (globalThis as any).OfflineAudioContext;
    }
  });

  test("rejects (no waveform) where audio decoding is unavailable", async () => {
    globalThis.fetch = (async () => new Response("x")) as typeof fetch;
    await expect(loadWaveformBars({ url: "https://audio.example.org/c.mp3", duration: 30 })).rejects.toThrow(
      /unsupported/,
    );
  });

  test("falls back to decoding when the linked peaks are broken, and rejects for audio that is too long", async () => {
    globalThis.fetch = (async () => new Response("not peaks", { status: 200 })) as typeof fetch;
    await expect(
      loadWaveformBars({
        url: "https://audio.example.org/long.mp4",
        waveformUrl: "https://audio.example.org/long.peaks.json",
        duration: 5000,
      }),
    ).rejects.toThrow(/too long/);
  });

  test("an aborted caller rejects without poisoning the shared load", async () => {
    globalThis.fetch = (async () => new Response(peaksJson([-64, 64]))) as typeof fetch;
    const controller = new AbortController();
    controller.abort(new Error("gone"));
    await expect(loadWaveformBars({ url: "https://a/b.mp4", waveformUrl: "https://a/b.dat", signal: controller.signal })).rejects.toThrow("gone");
    await expect(loadWaveformBars({ url: "https://a/b.mp4", waveformUrl: "https://a/b.dat" })).resolves.toBeInstanceOf(Float32Array);
  });
});


test("full browser decode publishes real peaks from left to right", async () => {
  const samples = Float32Array.from({ length: 8000 }, (_, index) => Math.sin(index / 20) * 0.5);
  (globalThis as any).OfflineAudioContext = class {
    async decodeAudioData() { return { duration: 1, sampleRate: 8000, length: samples.length, numberOfChannels: 1, getChannelData: () => samples }; }
  };
  globalThis.fetch = (async () => new Response(new Uint8Array([1, 2, 3]))) as typeof fetch;
  const snapshots: Float32Array[] = [];
  try {
    const result = await generateWaveformPeaks("https://example.org/voice.mp3", {
      duration: 1,
      onProgress: (waveform) => snapshots.push(waveform.peaks.slice()),
    });
    expect(snapshots.length).toBeGreaterThan(1);
    for (const snapshot of snapshots) {
      const unmeasured = [...snapshot].findIndex(Number.isNaN);
      if (unmeasured >= 0) expect([...snapshot.slice(unmeasured)].every(Number.isNaN)).toBe(true);
    }
    expect(result.progress).toBe(1);
    expect([...result.peaks].every(Number.isFinite)).toBe(true);
    expect(result.peaks[0]).toBeLessThan(-0.4);
    expect(result.peaks[1]).toBeGreaterThan(0.4);
  } finally {
    delete (globalThis as any).OfflineAudioContext;
  }
});

test("editor-baked BBC JSON data URLs need no audio request", async () => {
  const data = peaksJson([-1000, 1000, -2000, 2000], { bits: 16, sample_rate: 8000, samples_per_pixel: 160 });
  const url = `data:application/json;base64,${Buffer.from(data).toString("base64")}`;
  // Use the real browser-compatible fetch implementation for a data URL.
  globalThis.fetch = originalFetch;
  const bars = await loadWaveformBars({ url: "https://never.example.org/audio.mp4", waveformUrl: url, duration: 1985 });
  expect(bars.length).toBe(WAVEFORM_BINS);
  expect(bars[0]).toBeGreaterThan(0);
});

test("Dataset value supplies inline peaks without fetching and regenerated values invalidate its stable ID", async () => {
  let requests = 0;
  globalThis.fetch = (async () => { requests++; throw new Error("Inline datasets must not be fetched"); }) as typeof fetch;
  const value = JSON.parse(new TextDecoder().decode(peaksJson([-1000, 1000, 0, 0], {bits:16,sample_rate:8000,samples_per_pixel:160})));
  const options = {url:"https://example.org/audio.mp4",waveformUrl:"https://example.org/canvas/waveform",duration:1985};
  const first = await loadWaveformBars({...options,waveformValue:value});
  expect(first[0]).toBeGreaterThan(0);
  expect(first.at(-1)).toBe(0);
  const changed = {...value, data:[0,0,-1000,1000]};
  const second = await loadWaveformBars({...options,waveformValue:changed});
  expect(second[0]).toBe(0);
  expect(second.at(-1)).toBeGreaterThan(0);
  const jsonString = await loadWaveformBars({...options,waveformValue:JSON.stringify(changed)});
  expect([...jsonString]).toEqual([...second]);
  expect(requests).toBe(0);
});

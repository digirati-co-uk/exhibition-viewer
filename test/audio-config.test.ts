import { describe, expect, test } from "bun:test";
import {
  AUDIO_BEHAVIORS,
  DEFAULT_AUDIO_THEME_OPTIONS,
  canDecodeWaveform,
  findWaveformUrl,
  isSoundStrategy,
  resolveAudioOptions,
} from "../src/helpers/audio";
import {
  type ExhibitionThemePreset,
  getThemeCssVariables,
  getThemePreset,
  resolveThemeConfig,
  resolveThemeFromSources,
} from "../src/theme/exhibition-theme";

const presets: ExhibitionThemePreset[] = [
  "delft",
  "minimal",
  "gallery",
  "nocturne",
  "leeds-brown",
  "leeds-white",
  "leeds-pink",
  "leeds-orange",
];

describe("audio canvas behaviors", () => {
  test("default to waveform on, contain, no autoplay", () => {
    expect(resolveAudioOptions([])).toEqual({
      showWaveform: true,
      imageFit: "contain",
      autoplay: false,
      waveformOpacity: 0.55,
    });
    expect(resolveAudioOptions(undefined)).toEqual(resolveAudioOptions([]));
  });

  test("the `audio` marker alone changes nothing", () => {
    expect(resolveAudioOptions(["audio", "h-6", "w-12"])).toEqual(resolveAudioOptions([]));
  });

  test("waveform behaviors", () => {
    expect(resolveAudioOptions([AUDIO_BEHAVIORS.noWaveform]).showWaveform).toBe(false);
    expect(resolveAudioOptions([AUDIO_BEHAVIORS.waveform]).showWaveform).toBe(true);
  });

  test("image fit behaviors, including the existing `cover` alias", () => {
    expect(resolveAudioOptions(["image-cover"]).imageFit).toBe("cover");
    expect(resolveAudioOptions(["cover"]).imageFit).toBe("cover");
    expect(resolveAudioOptions(["image-contain"]).imageFit).toBe("contain");
  });

  test("autoplay is opt-in", () => {
    expect(resolveAudioOptions(["autoplay"]).autoplay).toBe(true);
    expect(resolveAudioOptions(["no-autoplay"]).autoplay).toBe(false);
    expect(resolveAudioOptions([]).autoplay).toBe(false);
  });

  test("the last behavior of a pair wins", () => {
    expect(resolveAudioOptions(["image-cover", "image-contain"]).imageFit).toBe("contain");
    expect(resolveAudioOptions(["image-contain", "image-cover"]).imageFit).toBe("cover");
    expect(resolveAudioOptions(["audio-waveform", "no-audio-waveform"]).showWaveform).toBe(false);
    expect(resolveAudioOptions(["no-audio-waveform", "audio-waveform"]).showWaveform).toBe(true);
    expect(resolveAudioOptions(["autoplay", "no-autoplay"]).autoplay).toBe(false);
  });

  test("layout behaviors are ignored", () => {
    expect(resolveAudioOptions(["left", "top", "float-bottom-right", "h-8"])).toEqual(resolveAudioOptions([]));
  });
});

describe("audio theme defaults", () => {
  test("every preset carries the audio defaults", () => {
    for (const preset of presets) {
      expect([preset, getThemePreset(preset).audio]).toEqual([preset, DEFAULT_AUDIO_THEME_OPTIONS]);
    }
  });

  test("theme.audio supplies defaults that canvas behaviors override", () => {
    const base = { showWaveform: false, imageFit: "cover", autoplay: true } as const;
    expect(resolveAudioOptions([], base)).toMatchObject(base);
    expect(resolveAudioOptions(["audio-waveform", "image-contain", "no-autoplay"], base)).toMatchObject({
      showWaveform: true,
      imageFit: "contain",
      autoplay: false,
    });
  });

  test("partial theme.audio merges over the preset (e.g. from a manifest theme service)", () => {
    const theme = resolveThemeConfig({ preset: "nocturne", audio: { imageFit: "cover", autoplay: true } });
    expect(theme.audio).toEqual({ ...DEFAULT_AUDIO_THEME_OPTIONS, imageFit: "cover", autoplay: true });
  });

  test("a stored theme without `audio` still resolves to defaults", () => {
    expect(resolveThemeConfig({ preset: "gallery" }).audio).toEqual(DEFAULT_AUDIO_THEME_OPTIONS);
  });

  test("the manifest theme service carries theme.audio into the resolved theme", () => {
    const manifest = {
      service: [{ profile: "https://exhibitionviewer.org/iiif/theme-service", theme: { audio: { showWaveform: false } } }],
    };
    const theme = resolveThemeFromSources({ manifest: manifest as any });
    expect(theme.audio.showWaveform).toBe(false);
    expect(theme.audio.imageFit).toBe("contain");
  });

  test("invalid option values fall back safely", () => {
    const options = resolveAudioOptions([], { imageFit: "stretch" as any, waveformOpacity: 9 });
    expect(options.imageFit).toBe("contain");
    expect(options.waveformOpacity).toBe(1);
    expect(resolveAudioOptions([], { waveformOpacity: Number.NaN }).waveformOpacity).toBe(0.55);
  });

  test("colour overrides are only emitted as CSS variables when set", () => {
    const plain = getThemeCssVariables(getThemePreset("delft")) as Record<string, string>;
    expect("--exv-audio-progress" in plain).toBe(false);
    expect("--exv-audio-track" in plain).toBe(false);

    const custom = getThemeCssVariables(
      resolveThemeConfig({ preset: "delft", audio: { progressColor: "#ff0066", trackColor: "#eeeeee" } }),
    ) as Record<string, string>;
    expect(custom["--exv-audio-progress"]).toBe("#ff0066");
    expect(custom["--exv-audio-track"]).toBe("#eeeeee");
  });
});

describe("audio resources", () => {
  test("detects Sound media strategies only", () => {
    expect(isSoundStrategy({ type: "media", media: { type: "Sound" } })).toBe(true);
    expect(isSoundStrategy({ type: "media", media: { type: "Video" } })).toBe(false);
    expect(isSoundStrategy({ type: "images" })).toBe(false);
    expect(isSoundStrategy(null)).toBe(false);
  });

  test("finds pre-computed waveform data by profile or filename", () => {
    expect(findWaveformUrl([{ id: "https://x.org/a.peaks.json" }])).toBe("https://x.org/a.peaks.json");
    expect(findWaveformUrl([{ id: "https://x.org/a.dat" }])).toBe("https://x.org/a.dat");
    expect(findWaveformUrl([{ id: "https://x.org/data", profile: "https://example.org/profiles/waveform" }])).toBe(
      "https://x.org/data",
    );
    expect(findWaveformUrl([{ id: "https://x.org/transcript.json" }], undefined as any)).toBeNull();
    expect(findWaveformUrl([])).toBeNull();
  });

  test("prefers editor-baked peaks over earlier waveform links", () => {
    const baked = "data:application/json;base64,e30=";
    expect(findWaveformUrl([{ id: "https://x.org/old.dat" }], [
      { id: baked, profile: "https://exhibitionviewer.org/profiles/generated-waveform" },
    ])).toBe(baked);
  });

  test("only fully decodes short audio in the browser", () => {
    expect(canDecodeWaveform(60)).toBe(true);
    expect(canDecodeWaveform(undefined)).toBe(true);
    expect(canDecodeWaveform(1985)).toBe(false);
  });
});

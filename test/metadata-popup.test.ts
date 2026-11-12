import { describe, expect, test } from "bun:test";
import {
  getCanvasMetadataContent,
  hasCanvasMetadataContent,
  resolveMetadataPopupEnabled,
} from "../src/helpers/canvas-metadata";
import {
  getThemePreset,
  mergeThemeInputs,
  resolveThemeConfig,
  type ExhibitionThemePreset,
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

describe("metadata popup configuration", () => {
  test("is enabled by default in every option group of every preset", () => {
    for (const preset of presets) {
      const theme = getThemePreset(preset);
      expect([preset, theme.delft.exhibition.metadataPopup]).toEqual([preset, true]);
      expect([preset, theme.delft.slideshow.metadataPopup]).toEqual([preset, true]);
      expect([preset, theme.delft.presentation.metadataPopup]).toEqual([preset, true]);
      expect([preset, theme.scroll.options.metadataPopup]).toEqual([preset, true]);
    }
  });

  test("preserves an explicit false from the theme through resolution", () => {
    for (const preset of presets) {
      const theme = resolveThemeConfig({
        preset,
        delft: {
          exhibition: { metadataPopup: false },
          slideshow: { metadataPopup: false },
          presentation: { metadataPopup: false },
        },
        scroll: { options: { metadataPopup: false } },
      });
      expect(theme.delft.exhibition.metadataPopup).toBe(false);
      expect(theme.delft.slideshow.metadataPopup).toBe(false);
      expect(theme.delft.presentation.metadataPopup).toBe(false);
      expect(theme.scroll.options.metadataPopup).toBe(false);
      // Other options keep their preset values.
      expect(theme.delft.exhibition.imageInfoIcon).toBe(getThemePreset(preset).delft.exhibition.imageInfoIcon);
    }
  });

  test("explicit false component options win over an enabled theme, and undefined does not disable", () => {
    const base = getThemePreset("delft").delft.slideshow;
    expect(mergeThemeInputs(base, { metadataPopup: false })?.metadataPopup).toBe(false);
    expect(mergeThemeInputs(base, { metadataPopup: undefined })?.metadataPopup).toBe(true);
  });

  test("resolves prop > surrounding theme > enabled", () => {
    expect(resolveMetadataPopupEnabled(undefined, undefined)).toBe(true);
    expect(resolveMetadataPopupEnabled(undefined, false)).toBe(false);
    expect(resolveMetadataPopupEnabled(false, true)).toBe(false);
    expect(resolveMetadataPopupEnabled(true, false)).toBe(true);
    expect(resolveMetadataPopupEnabled(null, null)).toBe(true);
  });
});

describe("canvas metadata content", () => {
  test("collects presentable metadata, rights and required statement", () => {
    const content = getCanvasMetadataContent({
      metadata: [
        { label: { en: ["Date"] }, value: { en: ["1900"] } },
        { label: { en: [""] }, value: { en: ["  "] } },
      ],
      rights: " https://creativecommons.org/licenses/by/4.0/ ",
      requiredStatement: { label: { en: ["Attribution"] }, value: { en: ["Leeds Library"] } },
    });

    expect(content.metadata).toHaveLength(1);
    expect(content.rights).toBe("https://creativecommons.org/licenses/by/4.0/");
    expect(content.requiredStatement?.value).toEqual({ en: ["Leeds Library"] });
    expect(hasCanvasMetadataContent(content)).toBe(true);
  });

  test("rights and required statements do not make an empty metadata popup visible", () => {
    expect(hasCanvasMetadataContent(getCanvasMetadataContent({
      rights: "https://example.org/rights",
      requiredStatement: {label:{en:["Credit"]},value:{en:["Library"]}},
    }))).toBe(false);
  });

  test("an empty or missing canvas has no content, so no button is rendered", () => {
    expect(hasCanvasMetadataContent(getCanvasMetadataContent(undefined))).toBe(false);
    expect(
      hasCanvasMetadataContent(
        getCanvasMetadataContent({
          metadata: [],
          rights: "",
          requiredStatement: { label: { en: ["Attribution"] }, value: { en: [""] } },
        })
      )
    ).toBe(false);
  });
});


test("popup metadata and required statements share the safe descriptive HTML renderer", () => {
  const unsafe = { label:{en:['<b>Source</b>']}, value:{en:['<img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><a href="https://example.org/" onclick="alert(1)">source</a><script>alert(1)</script>']} };
  const content = getCanvasMetadataContent({metadata:[unsafe],requiredStatement:unsafe});
  for (const row of [content.metadata[0]!, content.requiredStatement!]) {
    expect(row.label).toEqual({en:['<b>Source</b>']});
    const html = row.value.en![0]!;
    expect(html).not.toMatch(/<img|<script|onerror|onclick|javascript:/);
    expect(html).toContain('href="https://example.org/"');
  }
});

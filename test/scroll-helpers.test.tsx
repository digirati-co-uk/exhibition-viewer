import { describe, expect, test } from "bun:test";
import { Vault } from "@iiif/helpers/vault";
import { renderToStaticMarkup } from "react-dom/server";
import { CanvasContext, VaultProvider } from "react-iiif-vault";
import { ScrollImageBlock } from "../src/components/scroll/ScrollImageBlock";
import { ScrollPanelSection } from "../src/components/scroll/ScrollPanelSection";
import { getAnnotationItemRefs, getPaintingItemRefs, hasAnnotationItems } from "../src/helpers/canvas-pages";
import { getScrollBlockKind } from "../src/helpers/scroll-block-kind";
import {
  ScrollContentProvider,
  defaultScrollContent,
  formatScrollContent,
  useScrollContent,
} from "../src/helpers/scroll-content";
import { getScrollLayoutConfig } from "../src/helpers/scroll-layout";
import { CAPTION_CLEARANCE_MIN_WIDTH, TOUR_BASE_PADDING_PX, getTourCameraPadding } from "../src/helpers/use-caption-insets";
import { LAZY_MOUNT_MARGIN } from "../src/helpers/use-lazy-mount";
import { getYouTubeEmbedUrl } from "../src/helpers/youtube";
import { ScrollThemeProvider } from "../src/theme/scroll-theme";

describe("getScrollBlockKind", () => {
  test("image-details wins even without annotations", () => {
    expect(getScrollBlockKind(["image-details"], false)).toBe("image-details");
    expect(getScrollBlockKind(["image-details", "compact-deck"], true)).toBe("image-details");
  });

  test("layouts that need annotations fall back to a plain image without them", () => {
    expect(getScrollBlockKind(["compact-deck"], false)).toBe("image");
    expect(getScrollBlockKind(["manual-tour"], false)).toBe("image");
    expect(getScrollBlockKind(undefined, false)).toBe("image");
  });

  test("annotated canvases are tours, or compact decks when asked", () => {
    expect(getScrollBlockKind(undefined, true)).toBe("tour");
    expect(getScrollBlockKind(["manual-tour"], true)).toBe("tour");
    expect(getScrollBlockKind(["compact-deck"], true)).toBe("compact-deck");
  });
});

describe("canvas pages", () => {
  const vault = new Vault();
  const manifestId = "https://example.org/manifest";
  const page = (id: string, count: number, type: "painting" | "commenting") => ({
    id,
    type: "AnnotationPage",
    items: Array.from({ length: count }, (_, i) => ({
      id: `${id}/${i}`,
      type: "Annotation",
      motivation: type,
      body: { id: `${id}/${i}/body`, type: "Image" },
      target: "https://example.org/canvas/1",
    })),
  });
  vault.loadManifestSync(manifestId, {
    "@context": "http://iiif.io/api/presentation/3/context.json",
    id: manifestId,
    type: "Manifest",
    label: { en: ["Manifest"] },
    items: [
      {
        id: "https://example.org/canvas/1",
        type: "Canvas",
        height: 100,
        width: 100,
        items: [page("https://example.org/paint/1", 2, "painting"), page("https://example.org/paint/2", 1, "painting")],
        annotations: [page("https://example.org/notes/1", 0, "commenting"), page("https://example.org/notes/2", 3, "commenting")],
      },
      { id: "https://example.org/canvas/2", type: "Canvas", height: 100, width: 100, items: [], annotations: [page("https://example.org/notes/3", 0, "commenting")] },
    ],
  } as any);
  const canvas1 = vault.get<any>("https://example.org/canvas/1");
  const canvas2 = vault.get<any>("https://example.org/canvas/2");

  test("flattens every painting page, not just the first", () => {
    expect(getPaintingItemRefs(vault, canvas1)).toHaveLength(3);
  });

  test("flattens every annotation page, including ones after an empty first page", () => {
    expect(getAnnotationItemRefs(vault, canvas1)).toHaveLength(3);
    expect(hasAnnotationItems(vault, canvas1)).toBe(true);
  });

  test("a canvas with only empty annotation pages has no annotations", () => {
    expect(hasAnnotationItems(vault, canvas2)).toBe(false);
    expect(getAnnotationItemRefs(vault, canvas2)).toHaveLength(0);
  });
});

describe("tour camera padding", () => {
  test("with no insets every edge gets the same screen-pixel margin", () => {
    expect(getTourCameraPadding([], 0, 0)).toEqual({
      left: TOUR_BASE_PADDING_PX,
      right: TOUR_BASE_PADDING_PX,
      top: TOUR_BASE_PADDING_PX,
      bottom: TOUR_BASE_PADDING_PX,
    });
  });

  test("a left caption pushes the camera right and a right caption pushes it left", () => {
    expect(getTourCameraPadding([300], 0, 1).left).toBe(TOUR_BASE_PADDING_PX + 300);
    expect(getTourCameraPadding([300], 0, 1).right).toBe(TOUR_BASE_PADDING_PX);
    expect(getTourCameraPadding([-300], 0, 1).right).toBe(TOUR_BASE_PADDING_PX + 300);
    expect(getTourCameraPadding([-300], 0, 1).left).toBe(TOUR_BASE_PADDING_PX);
  });

  test("blends between the previous and current caption while scrolling between stops", () => {
    const halfway = getTourCameraPadding([400, -200], 1, 0.5);
    expect(halfway.left).toBe(TOUR_BASE_PADDING_PX + 200);
    expect(halfway.right).toBe(TOUR_BASE_PADDING_PX + 100);
    // Top and bottom never change with the captions.
    expect(halfway.top).toBe(TOUR_BASE_PADDING_PX);
    expect(halfway.bottom).toBe(TOUR_BASE_PADDING_PX);
  });

  test("progress outside 0..1 is clamped", () => {
    expect(getTourCameraPadding([300], 0, 5).left).toBe(TOUR_BASE_PADDING_PX + 300);
    expect(getTourCameraPadding([300], 0, -2).left).toBe(TOUR_BASE_PADDING_PX);
  });

  test("clearance only applies on wide viewers", () => {
    expect(CAPTION_CLEARANCE_MIN_WIDTH).toBe(768);
  });
});

describe("getYouTubeEmbedUrl", () => {
  test("sends the full encoded origin, not just the host", () => {
    const url = getYouTubeEmbedUrl("abc123", "https://example.org:8443");
    expect(url).toContain("https://www.youtube.com/embed/abc123?");
    expect(url).toContain("origin=https%3A%2F%2Fexample.org%3A8443");
    expect(url).toContain("enablejsapi=1");
  });

  test("encodes the video id and omits an empty origin", () => {
    const url = getYouTubeEmbedUrl("a/b c", "");
    expect(url).toContain("/embed/a%2Fb%20c?");
    expect(url).not.toContain("origin=");
  });
});

describe("scroll content", () => {
  function Probe() {
    const content = useScrollContent();
    return <span>{`${content.next}|${content.manualTour}`}</span>;
  }

  test("falls back to the defaults and merges partial overrides", () => {
    expect(renderToStaticMarkup(<Probe />)).toContain(`${defaultScrollContent.next}|${defaultScrollContent.manualTour}`);
    expect(
      renderToStaticMarkup(
        <ScrollContentProvider content={{ next: "Suivant", manualTour: undefined }}>
          <Probe />
        </ScrollContentProvider>,
      ),
    ).toContain(`Suivant|${defaultScrollContent.manualTour}`);
  });

  test("formats numbered templates", () => {
    expect(formatScrollContent(defaultScrollContent.goToTourStop, 3)).toBe("Go to tour stop 3");
  });
});

describe("scroll layout", () => {
  test("split keeps its side hint; floating positions come from the float behaviour", () => {
    expect(getScrollLayoutConfig(["split", "right"]).overlaySide).toBe("right");
    expect(getScrollLayoutConfig(["right"]).mode).toBe("split");
    expect(getScrollLayoutConfig(["float-top-right"]).overlaySide).toBe("right");
    expect(getScrollLayoutConfig(["float-top"]).overlaySide).toBe("center");
  });

  test("text stacks in the same grid cell as the image instead of an absolute overlay", () => {
    for (const behavior of [["floating"], []]) {
      const { overlayContainerClass } = getScrollLayoutConfig(behavior);
      expect(overlayContainerClass).toContain("lg:col-start-1");
      expect(overlayContainerClass).not.toContain("absolute");
    }
  });
});

describe("scroll image block layout", () => {
  const vault = new Vault();
  let counter = 0;
  function render(behavior: string[], summary = "Some words") {
    // The vault caches by id, so every render gets its own manifest and canvas.
    counter += 1;
    const manifestId = `https://example.org/layout/${counter}`;
    const canvasId = `${manifestId}/canvas/1`;
    vault.loadManifestSync(manifestId, {
      "@context": "http://iiif.io/api/presentation/3/context.json",
      id: manifestId,
      type: "Manifest",
      label: { en: ["Manifest"] },
      items: [
        {
          id: canvasId,
          type: "Canvas",
          label: { en: ["Title"] },
          summary: { en: [summary] },
          behavior,
          height: 100,
          width: 100,
          items: [],
        },
      ],
    } as any);
    const canvas = vault.get<any>(canvasId);
    return renderToStaticMarkup(
      <VaultProvider vault={vault}>
        <CanvasContext canvas={canvas.id}>
          <ScrollThemeProvider options={{}}>
            <ScrollImageBlock canvas={canvas} index={1} />
          </ScrollThemeProvider>
        </CanvasContext>
      </VaultProvider>,
    );
  }

  test("text is never put in a nested scroller", () => {
    for (const behavior of [["floating"], ["left"], []]) {
      expect(render(behavior)).not.toContain("overflow-y-auto");
    }
  });

  test("below lg the section is a column so the image takes the space the text leaves", () => {
    const html = render(["floating"]);
    expect(html).toContain("flex w-full flex-col");
    expect(html).toContain("lg:grid");
  });

  test("split panels fill the column and centre their text", () => {
    const html = render(["left"]);
    expect(html).toContain("lg:flex-row-reverse");
    expect(html).toContain("lg:flex lg:flex-col lg:justify-center");
    expect(html).not.toContain("lg:grid");
  });
});

describe("ScrollPanelSection", () => {
  test("does not mount the viewer until it is near the viewport, and never nests a scroller", () => {
    const html = renderToStaticMarkup(
      <ScrollPanelSection id="s1" renderViewer={() => <div data-testid="viewer" />}>
        <p>Panel text</p>
      </ScrollPanelSection>,
    );
    expect(html).toContain("Panel text");
    expect(html).not.toContain("data-testid");
    expect(html).not.toContain("overflow-y-auto");
    expect(html).toContain("lg:sticky");
  });

  test("lazy mounting looks one viewport ahead and behind using percentages", () => {
    expect(LAZY_MOUNT_MARGIN).toBe("99% 0px 99% 0px");
  });
});

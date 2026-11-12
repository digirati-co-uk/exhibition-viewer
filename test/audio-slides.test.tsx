import { describe, expect, test, spyOn } from "bun:test";
import { Vault } from "@iiif/helpers/vault";
import { renderToStaticMarkup } from "react-dom/server";
import { CanvasContext, VaultProvider, useCanvas, useStaticRenderingStrategy } from "react-iiif-vault";
import fixture from "../public/audio-cookbook.json";
import { AudioBlockPresentation } from "../src/components/audio/AudioBlockPresentation";
import { MediaBlock } from "../src/components/exhibition/MediaBlock";
import { MediaBlockPresentation } from "../src/components/presentation/MediaBlockPresentation";
import { ScrollMediaBlock } from "../src/components/scroll/ScrollMediaBlock";
import { ExhibitionProvider, createExhibitionStore } from "../src/helpers/exhibition-store";
import { useAudioSlide } from "../src/components/audio/use-audio-slide";
import { getAudioArtworkCanvasId, getAudioArtworkTint } from "../src/components/audio/AudioArtwork";
import { isSoundStrategy } from "../src/helpers/audio";
import { ScrollThemeProvider } from "../src/theme/scroll-theme";

function createVault() {
  const vault = new Vault();
  vault.loadManifestSync(fixture.id, JSON.parse(JSON.stringify(fixture)));
  return vault;
}

test("presentation waits for Sound to end instead of scheduling its image timer", () => {
  const vault = createVault();
  const store = createExhibitionStore({ vault: vault as any, manifest: vault.get(fixture.id) as any, firstStep: true });
  const timer = spyOn(globalThis, "setTimeout");
  try {
    store.getState().play();
    expect(store.getState().isPlaying).toBe(true);
    expect(timer).not.toHaveBeenCalled();
    store.getState().nextStep();
    expect(store.getState().currentStep).toBe(1);
    expect(store.getState().stepVisit).toBe(1);
    expect(timer).not.toHaveBeenCalled();
  } finally {
    store.getState().pause();
    timer.mockRestore();
  }
});

const canvasIds = fixture.items.map((item) => item.id);

function Slide({ children }: { children: (props: { canvas: any; strategy: any }) => React.ReactNode }) {
  const canvas = useCanvas();
  const strategy = useStaticRenderingStrategy();
  return <>{children({ canvas, strategy })}</>;
}

function renderSlide(
  canvasId: string,
  render: (props: { canvas: any; strategy: any }) => React.ReactNode,
  wrap: (children: React.ReactNode, vault: Vault) => React.ReactNode = (children) => children,
) {
  const vault = createVault();
  return renderToStaticMarkup(
    <VaultProvider vault={vault}>
      {wrap(
        <CanvasContext canvas={canvasId}>
          <Slide>{render}</Slide>
        </CanvasContext>,
        vault,
      )}
    </VaultProvider>,
  );
}

describe("cookbook audio fixture", () => {
  test("is a real IIIF Sound canvas that resolves to the media strategy with an accompanyingCanvas", () => {
    const vault = createVault();
    for (const id of canvasIds) {
      let strategy: any;
      renderToStaticMarkup(
        <VaultProvider vault={vault}>
          <CanvasContext canvas={id}>
            <Slide>
              {({ strategy: current }) => {
                strategy = current;
                return null;
              }}
            </Slide>
          </CanvasContext>
        </VaultProvider>,
      );
      expect(isSoundStrategy(strategy)).toBe(true);
      expect(strategy.media.url).toBe("https://fixtures.iiif.io/audio/indiana/mahler-symphony-3/CD1/medium/128Kbps.mp4");
      expect(strategy.media.duration).toBeCloseTo(1985.024);
    }

    const first: any = vault.get(canvasIds[0]!);
    expect(first.accompanyingCanvas?.type).toBe("Canvas");
  });
});

describe("audio slide data", () => {
  function slideData(id: string, audio?: Record<string, unknown>) {
    let data: ReturnType<typeof useAudioSlide> | undefined;
    let artwork: string | null = null;
    renderSlide(id, ({ canvas, strategy }) => {
      const Capture = () => {
        data = useAudioSlide(canvas, strategy, audio);
        artwork = getAudioArtworkCanvasId(canvas);
        return null;
      };
      return <Capture />;
    });
    return { data: data!, artwork: artwork as string | null };
  }

  test("finds the linked pre-computed waveform, the accompanying artwork and the options", () => {
    const first = slideData(canvasIds[0]!);
    expect(first.data.waveformUrl).toBe("/audio/mahler-symphony-3-cd1.peaks.json");
    expect(first.artwork).toBe(`${canvasIds[0]}/accompanying`);
    expect(first.data.duration).toBeCloseTo(1985.024);
    expect(first.data.title).toBe("Default: contain artwork, waveform");
    expect(first.data.options).toMatchObject({ showWaveform: true, imageFit: "contain", autoplay: false });
  });

  test("slides without links fall back cleanly", () => {
    expect(slideData(canvasIds[4]!).data.waveformUrl).toBeNull(); // no peaks
    expect(slideData(canvasIds[3]!).artwork).toBeNull(); // no accompanyingCanvas
    expect(slideData(canvasIds[3]!).data.options.autoplay).toBe(true); // `autoplay` behavior
  });
});

describe("audio slide (full page / slideshow grid)", () => {
  const render = (id: string, props: Record<string, unknown> = {}) =>
    renderSlide(id, ({ canvas, strategy }) => (
      <MediaBlock canvas={canvas} strategy={strategy} index={0} fullWidthGrid {...props} />
    ));

  test("starts with a large play button over the artwork and hidden, inert controls", () => {
    const html = render(canvasIds[0]!);
    expect(html).toContain("exv-audio-start");
    expect(html).toContain('aria-label="Play Default: contain artwork, waveform"');
    expect(html).toContain('data-audio-started="false"');
    expect(html).toContain('data-audio-fit="contain"');
    // controls exist for fade-in but are hidden from sighted + assistive tech until playback begins
    expect(html).toMatch(/class="exv-audio-controls"[^>]*data-visible="false"[^>]*aria-hidden="true"/);
    expect(html).toContain("inert");
  });

  test("plays inline: no dialog, no fullscreen control", () => {
    const html = render(canvasIds[0]!);
    expect(html).not.toContain("Media player");
    expect(html).not.toContain("<dialog");
    expect(html).not.toMatch(/fullscreen/i);
    expect(html).toContain("<audio");
    expect(html).toContain("https://fixtures.iiif.io/audio/indiana/mahler-symphony-3/CD1/medium/128Kbps.mp4");
  });

  test("exposes accessible seek, time, volume and mute controls", () => {
    const html = render(canvasIds[0]!);
    expect(html).toContain('aria-label="Seek"');
    expect(html).toContain('aria-valuetext="0 seconds of 33 minutes 5 seconds"');
    expect(html).toContain('aria-label="Volume"');
    expect(html).toContain('aria-label="Mute"');
    expect(html).toContain("33:05");
  });

  test("canvas behaviors drive fit, waveform and label placement", () => {
    const cover = render(canvasIds[1]!);
    expect(cover).toContain('data-audio-fit="cover"');
    expect(cover).toContain('data-info-left="true"');
    // side panel carries the label + summary, so the controls do not repeat the title
    expect(cover).toContain("The score fills the slide");
    expect(cover).not.toContain('class="exv-audio-title"');

    const noWave = render(canvasIds[2]!);
    expect(noWave).toContain('data-audio-waveform="off"');
    expect(noWave).toContain('data-info-bottom="true"');
    expect(noWave).not.toContain('class="exv-audio-wave"');

    const top = render(canvasIds[3]!);
    expect(top).toContain('data-info-top="true"');
  });

  test("theme.audio defaults apply, and canvas behaviors still win", () => {
    const themed = render(canvasIds[0]!, { audio: { imageFit: "cover", showWaveform: false } });
    expect(themed).toContain('data-audio-fit="cover"');
    expect(themed).toContain('data-audio-waveform="off"');

    const overridden = render(canvasIds[1]!, { audio: { imageFit: "contain" } });
    expect(overridden).toContain('data-audio-fit="cover"');
  });

  test("the metadata popup is a sibling of the player, never nested in it", () => {
    const html = render(canvasIds[0]!, { metadataPopup: false });
    expect(html).not.toContain("exhibition-metadata-trigger");
  });
});

describe("audio slide (scroll)", () => {
  const render = (id: string) =>
    renderSlide(
      id,
      ({ canvas, strategy }) => <ScrollMediaBlock canvas={canvas} strategy={strategy} index={1} scrollEnabled />,
      (children) => <ScrollThemeProvider options={{}}>{children}</ScrollThemeProvider>,
    );

  test("renders a full-viewport inline section (not a modal) once visible", () => {
    const html = render(canvasIds[0]!);
    expect(html).not.toContain("Media player");
    expect(html).not.toContain("<dialog");
    expect(html).toContain("min-h-screen");
  });
});

describe("audio slide (presentation)", () => {
  function renderPresentation(id: string, currentStep: number, behavior: Record<string, unknown> = {}) {
    const vault = createVault();
    const store = createExhibitionStore({
      vault: vault as any,
      manifest: vault.get(fixture.id) as any,
      objectLinks: [],
      firstStep: true,
      // zustand's server snapshot is the initial state, so the current step has to be part of creation.
      startCanvasIndex: currentStep,
    });
    return renderToStaticMarkup(
      <VaultProvider vault={vault}>
        <ExhibitionProvider store={store}>
          <CanvasContext canvas={id}>
            <Slide>
              {({ canvas, strategy }) => (
                <MediaBlockPresentation active={false} canvas={canvas} strategy={strategy} index={0} {...behavior} />
              )}
            </Slide>
          </CanvasContext>
        </ExhibitionProvider>
      </VaultProvider>,
    );
  }

  test("only the current step is active (others are inert + hidden)", () => {
    const activeHtml = renderPresentation(canvasIds[0]!, 0);
    expect(activeHtml).toMatch(/^<section aria-hidden="false" class=/);
    expect(activeHtml).toContain("exv-audio-start");

    const inactiveHtml = renderPresentation(canvasIds[0]!, 1);
    expect(inactiveHtml).toMatch(/^<section aria-hidden="true" inert="" class=/);
    expect(inactiveHtml).toContain("opacity-0");
  });

  test("label + summary placement uses the image slide layout", () => {
    const html = renderPresentation(canvasIds[1]!, 1);
    expect(html).toContain("flex-row-reverse"); // left
    const bottom = renderPresentation(canvasIds[2]!, 2);
    expect(bottom).toContain("flex-col");
    const top = renderPresentation(canvasIds[3]!, 3);
    expect(top).toContain("flex-col-reverse");
  });

  test("exports the presentation component", () => {
    expect(typeof AudioBlockPresentation).toBe("function");
  });
});


test("contain background tint resolves the slide colour before its accompanying canvas", () => {
  expect(getAudioArtworkTint({backgroundColor: "#123456"}, {backgroundColor: "#abcdef"})).toBe("#123456");
  expect(getAudioArtworkTint({}, {backgroundColor: " #abcdef "})).toBe("#abcdef");
  expect(getAudioArtworkTint({background: "rebeccapurple"})).toBe("rebeccapurple");
  expect(getAudioArtworkTint({backgroundColor: " "}, null)).toBeUndefined();
});

test("audio slide resolves a normal-ID Dataset value through the IIIF vault", () => {
  const manifest: any = JSON.parse(JSON.stringify(fixture));
  const peaks = {version:2,bits:16,channels:1,sample_rate:8000,samples_per_pixel:8000,length:2,data:[-1,1,-2,2]};
  manifest.items[0].seeAlso = [{id:`${canvasIds[0]}/waveform`,type:"Dataset",format:"application/json",profile:"https://exhibitionviewer.org/profiles/generated-waveform",value:peaks}];
  const vault = new Vault();
  vault.loadManifestSync(manifest.id,manifest);
  let result: ReturnType<typeof useAudioSlide> | undefined;
  function Capture() {
    const canvas = useCanvas()!;
    const strategy = useStaticRenderingStrategy();
    result = useAudioSlide(canvas,strategy as any);
    return null;
  }
  renderToStaticMarkup(<VaultProvider vault={vault}><CanvasContext canvas={canvasIds[0]}><Capture /></CanvasContext></VaultProvider>);
  expect(result?.waveformUrl).toBe(`${canvasIds[0]}/waveform`);
  expect(result?.waveformValue).toEqual(peaks);
});


test("a one-audio-slide presentation signals a new activation when looping", () => {
  const vault = createVault();
  const store = createExhibitionStore({ vault: vault as any, canvases: [vault.get(fixture.items[0]!.id)] as any });
  store.getState().play();
  store.getState().nextStep(true);
  expect(store.getState().currentStep).toBe(0);
  expect(store.getState().stepVisit).toBe(1);
  expect(store.getState().isPlaying).toBe(true);
  store.getState().pause();
});

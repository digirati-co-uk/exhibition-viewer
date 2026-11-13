import { describe, expect, test } from "bun:test";
import { Vault } from "@iiif/helpers/vault";
import { renderToStaticMarkup } from "react-dom/server";
import { CanvasContext, VaultProvider, useCanvas, useStaticRenderingStrategy } from "react-iiif-vault";
import fixture from "../public/audio-cookbook.json";
import { sanitizeCreditHtml } from "../src/components/audio/credit-html";
import { MediaBlock } from "../src/components/exhibition/MediaBlock";
import { MediaBlockPresentation } from "../src/components/presentation/MediaBlockPresentation";
import { ScrollMediaBlock } from "../src/components/scroll/ScrollMediaBlock";
import { ScrollAudioContent } from "../src/components/audio/ScrollAudioBlock";
import { ExhibitionProvider, createExhibitionStore } from "../src/helpers/exhibition-store";
import { ScrollThemeProvider } from "../src/theme/scroll-theme";

const ATTRIBUTION = "Audio: Indiana University, via the IIIF Cookbook (recipe 0014 - accompanyingCanvas)";
const canvasIds = fixture.items.map((item) => item.id);
// canvas 1 has no summary (player-only) and canvas metadata; canvases 2-5 have summaries and no metadata.
const [NO_SUMMARY, WITH_SUMMARY, ...REST] = canvasIds as [string, string, ...string[]];

function createVault(mutate?: (manifest: any) => void) {
  const manifest = JSON.parse(JSON.stringify(fixture));
  mutate?.(manifest);
  const vault = new Vault();
  vault.loadManifestSync(manifest.id, manifest);
  return vault;
}

function Slide({ children }: { children: (props: { canvas: any; strategy: any }) => React.ReactNode }) {
  const canvas = useCanvas();
  const strategy = useStaticRenderingStrategy();
  return <>{children({ canvas, strategy })}</>;
}

function renderSlide(
  canvasId: string,
  render: (props: { canvas: any; strategy: any }) => React.ReactNode,
  options: { mutate?: (manifest: any) => void; wrap?: (children: React.ReactNode) => React.ReactNode } = {},
) {
  const vault = createVault(options.mutate);
  const wrap = options.wrap ?? ((children: React.ReactNode) => children);
  return renderToStaticMarkup(
    <VaultProvider vault={vault}>
      {wrap(
        <CanvasContext canvas={canvasId}>
          <Slide>{render}</Slide>
        </CanvasContext>,
      )}
    </VaultProvider>,
  );
}

const fullPage = (id: string, props: Record<string, unknown> = {}, options = {}) =>
  renderSlide(id, ({ canvas, strategy }) => <MediaBlock canvas={canvas} strategy={strategy} index={0} fullWidthGrid {...props} />, options);

const scroll = (id: string, options: Parameters<typeof renderSlide>[2] = {}) =>
  // The section mounts its content only once its IntersectionObserver fires, so render that content directly.
  renderSlide(id, ({ canvas, strategy }) => <ScrollAudioContent canvas={canvas} strategy={strategy} />, {
    ...options,
    wrap: (children) => <ScrollThemeProvider options={{}}>{children}</ScrollThemeProvider>,
  });

function presentation(id: string, step: number, props: Record<string, unknown> = {}, mutate?: (manifest: any) => void) {
  const vault = createVault(mutate);
  const store = createExhibitionStore({
    vault: vault as any,
    manifest: vault.get(fixture.id) as any,
    objectLinks: [],
    firstStep: true,
    startCanvasIndex: step,
  });
  return renderToStaticMarkup(
    <VaultProvider vault={vault}>
      <ExhibitionProvider store={store}>
        <CanvasContext canvas={id}>
          <Slide>
            {({ canvas, strategy }) => (
              <MediaBlockPresentation active={false} canvas={canvas} strategy={strategy} index={0} {...props} />
            )}
          </Slide>
        </CanvasContext>
      </ExhibitionProvider>
    </VaultProvider>,
  );
}

const count = (html: string, text: string) => html.split(text).length - 1;

/** The credit strip's markup, so we can assert where it sits. */
function credit(html: string) {
  const match = /<div class="exv-audio-credit"[^>]*>[\s\S]*?<\/div>/.exec(html);
  return match?.[0] ?? "";
}

function expectBeforePlayCredit(html: string) {
  // The slide has not been played: big play button, controls hidden/inert...
  expect(html).toContain("exv-audio-start");
  expect(html).toMatch(/class="exv-audio-controls"[^>]*data-visible="false"[^>]*aria-hidden="true"/);
  // ...the credit is inside that hidden, inert region until the audio is opened.
  expect(count(html, ATTRIBUTION)).toBe(1);
  const strip = credit(html);
  expect(strip).toContain(ATTRIBUTION);
  expect(strip).toContain("Attribution");
  const controls = html.slice(html.indexOf('class="exv-audio-controls"'), html.indexOf('class="exv-audio-credit"'));
  expect(controls).not.toContain(ATTRIBUTION);
  expect(html).toContain('data-audio-has-credit="true"');
}

describe("audio required statement: full page / slideshow", () => {
  test("player-only slide (no summary) contains it once in the unopened controls, without needing the metadata popup", () => {
    const html = fullPage(NO_SUMMARY, { metadataPopup: false });
    expect(html).not.toContain("exhibition-metadata-trigger");
    expect(html).not.toContain("exhibition-metadata-panel");
    expectBeforePlayCredit(html);
  });

  test("the metadata popup does not duplicate it (the popup is for canvas.metadata only)", () => {
    const html = fullPage(NO_SUMMARY);
    expect(html).toContain("exhibition-metadata-trigger");
    // Popover panels render only when opened, so the statement is still present exactly once.
    expect(count(html, ATTRIBUTION)).toBe(1);
  });

  test("slides with a summary panel and no metadata show it once, in the player", () => {
    for (const id of [WITH_SUMMARY, ...REST]) {
      const html = fullPage(id);
      expect(html).not.toContain("exhibition-metadata-trigger");
      expect(count(html, ATTRIBUTION)).toBe(1);
      expect(html).toContain("exv-audio-credit");
    }
  });

  test("lives under the label inside the hidden controls and outside any button", () => {
    const html = fullPage(NO_SUMMARY);
    expect(html).not.toContain('class="exv-audio-dock"');
    expect(html.indexOf('class="exv-audio-credit"')).toBeGreaterThan(html.indexOf('class="exv-audio-title"'));
    expect(html.indexOf('class="exv-audio-credit"')).toBeLessThan(html.indexOf('class="exv-audio-wave"'));
    // never inside the play / pause surface or the start button, so links cannot toggle playback
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*exv-audio-credit/);
  });

  test("has no strip when the canvas has no required statement", () => {
    const html = fullPage(NO_SUMMARY, {}, { mutate: (manifest: any) => { for (const item of manifest.items) delete item.requiredStatement; } });
    expect(html).not.toContain("exv-audio-credit");
    expect(html).toContain('data-audio-has-credit="false"');
    const blank = fullPage(NO_SUMMARY, {}, { mutate: (manifest: any) => { manifest.items[0].requiredStatement = { label: { en: ["x"] }, value: { en: ["  "] } }; } });
    expect(blank).not.toContain("exv-audio-credit");
  });

  test("renders label and value HTML through LocaleString, keeping safe links and dropping unsafe markup", () => {
    const html = fullPage(NO_SUMMARY, {}, {
      mutate: (manifest: any) => {
        manifest.items[0].requiredStatement = {
          label: { en: ["<b>Credit</b>"] },
          value: {
            en: [
              'Recorded by <a href="https://example.org/a?x=1&y=2" onclick="alert(1)">Indiana</a> <script>alert(1)</script><img src=x onerror=alert(1)> <a href="javascript:alert(1)">bad</a>',
            ],
          },
        };
      },
    });
    const strip = credit(html);
    expect(strip).toContain("<b>Credit</b>");
    expect(strip).toContain('href="https://example.org/a?x=1&amp;y=2"');
    expect(strip).toContain('target="_blank"');
    expect(strip).toContain('rel="noopener noreferrer"');
    expect(strip).not.toMatch(/onclick|onerror|<script|<img|javascript:/i);
    expect(strip).toContain("<a>bad</a>");
  });
});

describe("audio required statement: scroll", () => {
  test("uses the controls on a player-only and a summary slide, once each", () => {
    const player = scroll(NO_SUMMARY);
    expectBeforePlayCredit(player);
    expect(player).toContain("exhibition-metadata-trigger"); // metadata popup is separate from the credit
    const summary = scroll(WITH_SUMMARY);
    expect(count(summary, ATTRIBUTION)).toBe(1);
    expect(summary).not.toContain("exhibition-metadata-trigger");
  });

  test("the scroll section routes its content through the same component", () => {
    const html = renderSlide(
      NO_SUMMARY,
      ({ canvas, strategy }) => <ScrollMediaBlock canvas={canvas} strategy={strategy} index={1} scrollEnabled />,
      { wrap: (children) => <ScrollThemeProvider options={{}}>{children}</ScrollThemeProvider> },
    );
    expect(html).toContain("min-h-screen"); // content itself waits for the section to scroll into view
  });
});

describe("audio required statement: presentation", () => {
  test("player-only slide includes it in the closed controls, once, on the current step", () => {
    const html = presentation(NO_SUMMARY, 0, { metadataPopup: false });
    expectBeforePlayCredit(html);
  });

  test("a summary side panel no longer repeats it (single credit in the player)", () => {
    for (const [index, id] of [WITH_SUMMARY, ...REST].entries()) {
      const html = presentation(id, index + 1);
      expect(count(html, ATTRIBUTION)).toBe(1);
      expect(credit(html)).toContain(ATTRIBUTION);
      const panel = html.slice(html.indexOf("exhibition-info-block"));
      expect(panel).not.toContain(ATTRIBUTION);
    }
  });

  test("an inactive slide is inert and hidden, credit included", () => {
    const html = presentation(NO_SUMMARY, 1);
    expect(html).toMatch(/^<section aria-hidden="true" inert="" class=/);
    expect(count(html, ATTRIBUTION)).toBe(1);
  });
});

describe("sanitizeCreditHtml", () => {
  test("keeps the IIIF HTML subset and balances tags", () => {
    expect(sanitizeCreditHtml("a <i>b <b>c</i> d")).toBe("a <i>b <b>c</b></i> d");
    expect(sanitizeCreditHtml("x<br/>y<small>z</small>")).toBe("x<br>y<small>z</small>");
  });

  test("drops scripts with their content, unknown tags, handlers and unsafe schemes", () => {
    expect(sanitizeCreditHtml("<script>alert(1)</script>ok<style>p{}</style>")).toBe("ok");
    expect(sanitizeCreditHtml('<span onmouseover="x()" style="a:b">t</span>')).toBe("<span>t</span>");
    expect(sanitizeCreditHtml('<a href=" java\tscript:alert(1)">t</a>')).toBe("<a>t</a>");
    expect(sanitizeCreditHtml('<a href="data:text/html,x">t</a>')).toBe("<a>t</a>");
    expect(sanitizeCreditHtml('<a href="mailto:a@b.c">t</a>')).toContain('href="mailto:a@b.c"');
    expect(sanitizeCreditHtml("1 < 2 and <3")).toBe("1 &lt; 2 and &lt;3");
  });
});

import { describe, expect, test } from "bun:test";
import { Vault } from "@iiif/helpers/vault";
import { renderToStaticMarkup } from "react-dom/server";
import { CanvasContext, VaultProvider } from "react-iiif-vault";
import { CanvasMetadataPopup } from "../src/components/shared/CanvasMetadataPopup";

function render(canvasExtra: Record<string, unknown>, props: Parameters<typeof CanvasMetadataPopup>[0] = {}) {
  const vault = new Vault();
  vault.loadManifestSync("https://example.org/manifest", {
    "@context": "http://iiif.io/api/presentation/3/context.json",
    id: "https://example.org/manifest",
    type: "Manifest",
    label: { en: ["Manifest"] },
    items: [
      {
        id: "https://example.org/canvas/1",
        type: "Canvas",
        label: { en: ["Portrait"] },
        height: 100,
        width: 100,
        items: [],
        ...canvasExtra,
      },
    ],
  } as any);

  return renderToStaticMarkup(
    <VaultProvider vault={vault}>
      <CanvasContext canvas="https://example.org/canvas/1">
        <CanvasMetadataPopup {...props} />
      </CanvasContext>
    </VaultProvider>
  );
}

describe("CanvasMetadataPopup", () => {
  test("renders an accessible button for canvases with metadata", () => {
    const html = render({ metadata: [{ label: { en: ["Date"] }, value: { en: ["1900"] } }] });
    expect(html).toContain("<button");
    expect(html).toContain('aria-label="Show information about Portrait"');
    expect(html).toContain('aria-expanded="false"');
  });

  test("renders nothing without metadata, or when explicitly disabled", () => {
    expect(render({})).toBe("");
    expect(render({ metadata: [{ label: { en: ["Date"] }, value: { en: ["1900"] } }] }, { enabled: false })).toBe("");
  });

  test("hides the icon for rights or attribution alone, including the legacy fallback", () => {
    expect(render({ rights: "https://example.org/rights", requiredStatement: {label:{en:["Credit"]}, value:{en:["Library"]}} })).toBe("");
    expect(render({}, { decorativeFallback: true })).toBe("");
    expect(render({ metadata: [] })).toBe("");
    expect(render({ metadata: [{label:{en:[" "]},value:{en:[""]}}] })).toBe("");
  });
});

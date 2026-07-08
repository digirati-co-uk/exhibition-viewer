import type { Canvas } from "@iiif/presentation-3";
import type { CanvasNormalized } from "@iiif/presentation-3-normalized";
import { useIIIFLanguage } from "react-iiif-vault";
import type { ExhibitionStep } from "./exhibition-store";

function asLanguageString(value: string, language?: string) {
  return { [language || "none"]: [value] };
}

function splitHtmlH2(value: string) {
  if (typeof DOMParser === "undefined") {
    const match = value.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    const title = match?.[1].replace(/<[^>]+>/g, "").trim();
    if (!match || !title) return null;

    return {
      title,
      summary: value.replace(match[0], "").trim(),
    };
  }

  const document = new DOMParser().parseFromString(`<div>${value}</div>`, "text/html");
  const wrapper = document.body.firstElementChild;
  const h2 = wrapper?.querySelector("h2");
  const title = h2?.textContent?.trim();

  if (!h2 || !title) return null;

  h2.remove();

  return {
    title,
    summary: wrapper?.innerHTML.trim() || "",
  };
}

export function useStepDetails(
  canvas: CanvasNormalized | Canvas,
  step: ExhibitionStep | null,
) {
  const locale = useIIIFLanguage();
  const behavior = canvas.behavior || [];
  const isLeft = behavior.includes("left");
  const isRight = behavior.includes("right");
  const isBottom = behavior.includes("bottom");
  const isTop = behavior.includes("top");

  const isActive = step?.canvasId === canvas.id;
  const region = step?.region;
  const textualBodies = region
    ? step?.body.filter((t) => t.type === "TextualBody")
    : [];
  const showSummary =
    Boolean(canvas.summary && (isLeft || isRight || isBottom || isTop)) ||
    (isActive && region && step.label) ||
    (region && textualBodies.length > 0);

  const label = region ? step?.label : canvas.label;
  const summary = region ? step?.summary : canvas.summary;
  const h2Body =
    !label && !summary && step?.body.length === 1 && step.body[0]?.type === "TextualBody"
      ? splitHtmlH2((step.body[0] as any).value || "")
      : null;
  const resolvedLabel = h2Body?.title ? asLanguageString(h2Body.title, (step?.body[0] as any)?.language) : label;
  const resolvedSummary = h2Body ? asLanguageString(h2Body.summary, (step?.body[0] as any)?.language) : summary;

  const showBody = !(resolvedLabel && resolvedSummary);
  const toShow = showBody
    ? step?.body.length === 1
      ? step?.body || []
      : step?.body.filter((t: any) => (t as any).language === locale)
    : [];

  return {
    isActive,
    label: resolvedLabel,
    summary: resolvedSummary,
    showSummary,
    showBody,
    toShow,
    isLeft,
    isRight,
    isBottom,
    isTop,
  };
}

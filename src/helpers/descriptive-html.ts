import type { InternationalString, MetadataItem } from "@iiif/presentation-3";

/**
 * Tiny allow-list sanitiser for the HTML a IIIF label/value may carry (Presentation 3 "HTML in descriptive
 * properties": a, b, br, i, p, small, span, sub, sup). It works on strings, so it behaves the same on the server and in
 * the browser. Anything else - scripts, styles, event handlers, images, unknown tags - is dropped (text is kept), `<a>`
 * only keeps http(s)/mailto links and always opens in a new tab so a click never navigates away from the exhibition.
 */
const ALLOWED_TAGS = new Set(["a", "b", "br", "i", "p", "small", "span", "sub", "sup", "em", "strong"]);
const VOID_TAGS = new Set(["br"]);
const DROP_WITH_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "template", "noscript"]);
const SAFE_HREF = /^(https?:|mailto:)/i;

function escapeAttribute(value: string) {
  return value
    .replace(/&(?!(?:[a-z]+|#\d+|#x[0-9a-f]+);)/gi, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function readHref(attributes: string): string | null {
  const match = /(?:^|\s)href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(attributes);
  const raw = match ? (match[1] ?? match[2] ?? match[3] ?? "") : "";
  // Browsers ignore whitespace/control characters inside the scheme ("java\tscript:"), so strip them before testing.
  const href = raw.replace(/[\u0000- \u007f-\u009f]/g, "");
  return SAFE_HREF.test(href) ? raw.trim() : null;
}

export function sanitizeCreditHtml(input: string): string {
  const out: string[] = [];
  const open: string[] = [];
  const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
  let cursor = 0;
  let skipUntil: string | null = null;

  const text = (value: string) => {
    if (skipUntil) return;
    // Entities pass through; a stray "<" can never start a tag here.
    out.push(
      value
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
    );
  };

  for (let match = tag.exec(input); match; match = tag.exec(input)) {
    text(input.slice(cursor, match.index));
    cursor = match.index + match[0].length;
    const closing = match[1] === "/";
    const name = match[2]!.toLowerCase();

    if (skipUntil) {
      if (closing && name === skipUntil) skipUntil = null;
      continue;
    }
    if (!closing && DROP_WITH_CONTENT.has(name) && !match[0].endsWith("/>")) {
      skipUntil = name;
      continue;
    }
    if (!ALLOWED_TAGS.has(name)) continue;

    if (closing) {
      const index = open.lastIndexOf(name);
      if (index === -1) continue;
      // Close anything left open inside it so the markup stays balanced.
      while (open.length > index) out.push(`</${open.pop()}>`);
      continue;
    }

    if (name === "a") {
      const href = readHref(match[3] || "");
      out.push(href ? `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">` : "<a>");
    } else {
      out.push(`<${name}>`);
    }
    if (!VOID_TAGS.has(name)) open.push(name);
  }
  text(input.slice(cursor));
  while (open.length) out.push(`</${open.pop()}>`);
  return out.join("");
}

export function sanitizeCreditString<T extends InternationalString | string | null | undefined>(value: T): T {
  if (!value) return value;
  if (typeof value === "string") return sanitizeCreditHtml(value) as T;
  const next: Record<string, string[]> = {};
  for (const [language, entries] of Object.entries(value)) {
    next[language] = (entries || []).map((entry) => (typeof entry === "string" ? sanitizeCreditHtml(entry) : ""));
  }
  return next as unknown as T;
}

export function sanitizeCreditStatement(item: MetadataItem): MetadataItem {
  return { label: sanitizeCreditString(item.label), value: sanitizeCreditString(item.value) } as MetadataItem;
}

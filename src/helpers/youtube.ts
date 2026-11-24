/** Embed URL for the scroll, exhibition and presentation media blocks. YouTube needs the full, encoded origin. */
export function getYouTubeEmbedUrl(youTubeId: string, origin?: string) {
  const resolvedOrigin = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const params = new URLSearchParams({ enablejsapi: "1", modestbranding: "1", rel: "0" });
  if (resolvedOrigin) params.set("origin", resolvedOrigin);
  return `https://www.youtube.com/embed/${encodeURIComponent(youTubeId)}?${params.toString()}`;
}

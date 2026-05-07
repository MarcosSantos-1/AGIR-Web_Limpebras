/** Heurística para URLs remotas (sem MIME). Blob URLs tratadas pelo caller. */
export function isLikelyVideoUrl(url: string): boolean {
  const base = url.split("?")[0]?.toLowerCase() ?? "";
  return /\.(mp4|webm|mov|m4v|ogv|ogg)(\s|$)/i.test(base);
}

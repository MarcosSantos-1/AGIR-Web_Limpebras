import { parsePublicStorageBaseUrls } from "@/lib/storage/is-allowed-public-r2-url";
import { sanitizeStorageObjectKey } from "@/lib/storage/storage-object-key";

/** Decodifica segmentos da path (pathname sem barra inicial). */
function decodeKeyPath(rel: string): string {
  return rel
    .split("/")
    .map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    })
    .join("/");
}

/**
 * Se a URL for de uma das bases públicas R2 configuradas, devolve a chave sanitizada
 * (ex.: social/uuid.mp4); caso contrário null.
 */
export function storageKeyFromConfiguredPublicUrl(
  fullUrlRaw: string,
  publicBasesCsv: string,
): string | null {
  const trimmed = fullUrlRaw.trim();
  if (!trimmed.startsWith("https:")) return null;

  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return null;
  }

  if (u.username || u.password) return null;

  for (const baseRaw of parsePublicStorageBaseUrls(publicBasesCsv)) {
    let base: URL;
    try {
      base = new URL(baseRaw.trim());
    } catch {
      continue;
    }
    if (base.protocol !== "https:" || base.username || base.password)
      continue;
    if (u.origin !== base.origin) continue;

    const basePath =
      base.pathname === "/" ? "" : base.pathname.replace(/\/+$/, "");
    let rel: string | null = null;

    if (basePath) {
      if (u.pathname === basePath || u.pathname === `${basePath}/`) {
        continue;
      }
      if (
        !u.pathname.startsWith(`${basePath}/`) &&
        u.pathname !== basePath
      ) {
        continue;
      }
      rel = u.pathname.slice(basePath.length + 1);
    } else {
      rel = u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
    }

    if (!rel) continue;

    const key = decodeKeyPath(rel);
    const sanitized = sanitizeStorageObjectKey(key);
    if (sanitized) return sanitized;
  }

  return null;
}

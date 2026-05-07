/**
 * Limita URLs de proxied-download ao bucket público configurado (evita SSRF).
 */
export function isAllowedPublicR2Url(
  fullUrlRaw: string,
  publicBaseRaw: string,
): boolean {
  let u: URL;
  let base: URL;
  try {
    u = new URL(fullUrlRaw.trim());
    base = new URL(publicBaseRaw.trim());
  } catch {
    return false;
  }

  if (u.protocol !== "https:" || base.protocol !== "https:") return false;
  if (u.username || u.password || base.username || base.password) return false;
  if (u.origin !== base.origin) return false;

  const basePath =
    base.pathname === "/" ? "" : base.pathname.replace(/\/+$/, "");

  if (basePath) {
    const same =
      u.pathname === basePath || u.pathname.startsWith(`${basePath}/`);
    if (!same) return false;
  }

  return true;
}

/** Vários hosts/prefixos: `https://pub-xxx.r2.dev, https://cdn.exemplo.gov.br` */
export function parsePublicStorageBaseUrls(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAllowedAgainstAnyPublicBase(
  fullUrlRaw: string,
  basesCsv: string,
): boolean {
  const bases = parsePublicStorageBaseUrls(basesCsv);
  if (bases.length === 0) return false;
  return bases.some((base) => isAllowedPublicR2Url(fullUrlRaw, base));
}

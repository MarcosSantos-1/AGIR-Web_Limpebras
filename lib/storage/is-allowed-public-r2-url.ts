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

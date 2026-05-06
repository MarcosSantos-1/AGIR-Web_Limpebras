/** Prefixos gerados pela app (upload-helpers e chamadores). */
const ALLOWED_ROOTS = new Set(["social", "agenda", "historico", "galeria"]);

const SEGMENT_RE = /^[\w.-]{1,200}$/;

/** Comprimento máximo da chave S3 (bytes UTF-8). */
export const STORAGE_OBJECT_KEY_MAX_LEN = 500;

/**
 * Valida e devolve a chave do objeto ou null se for inválida (path traversal, caracteres proibidos).
 */
export function sanitizeStorageObjectKey(raw: string): string | null {
  const trimmed = raw.trim();
  if (
    !trimmed ||
    trimmed.startsWith("/") ||
    trimmed.includes("..") ||
    trimmed.length > STORAGE_OBJECT_KEY_MAX_LEN
  ) {
    return null;
  }

  const parts = trimmed.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  if (!ALLOWED_ROOTS.has(parts[0]!)) return null;

  for (const segment of parts) {
    if (segment === "." || segment === "..") return null;
    if (!SEGMENT_RE.test(segment)) return null;
  }

  return trimmed;
}

/** Junta base pública (r2.dev ou domínio custom) à chave, codificando cada segmento. */
export function publicUrlForStorageKey(publicBaseUrl: string, key: string): string {
  const base = publicBaseUrl.replace(/\/+$/, "");
  const path = key.split("/").map(encodeURIComponent).join("/");
  return `${base}/${path}`;
}

const MAX_BYTES = 35 * 1024 * 1024;

/** MIME permitidos para upload (imagens e vídeo). */
export function isAllowedObjectMime(mime: string): boolean {
  const m = mime.toLowerCase();
  return (
    m.startsWith("image/") ||
    m.startsWith("video/") ||
    m === "application/octet-stream"
  );
}

export function assertFileSizeWithinLimit(size: number): boolean {
  return size > 0 && size <= MAX_BYTES;
}

export { MAX_BYTES as STORAGE_UPLOAD_MAX_BYTES };

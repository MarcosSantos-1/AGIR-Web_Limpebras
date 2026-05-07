import { isLikelyVideoUrl } from "@/lib/media-url";

export type DownloadImageUrlOptions = {
  idToken?: string | null;
};

/** Segmento seguro para prefixo do nome do ficheiro. */
export function safeDownloadFilenameBase(raw: string): string {
  const t = raw.trim().replace(/\s+/g, "-").slice(0, 48);
  return t.replace(/[^a-zA-Z0-9-_]+/g, "") || "ficheiro";
}

/** Extensão a partir do path do URL (.png, .mp4 …). */
export function extensionFromMediaUrlPath(
  src: string,
  video: boolean,
): string {
  try {
    const path = new URL(src).pathname;
    const m = /\.([a-zA-Z0-9]{1,8})$/.exec(path);
    if (m) return m[1]!.toLowerCase();
  } catch {
    /* ignore */
  }
  return video ? "mp4" : "jpg";
}

/**
 * Descarrega vários URLs em sequência (útil para browsers que limitam popups paralelos).
 */
export async function downloadMediaUrlsSequentially(
  urls: string[],
  baseFilename: string,
  options?: DownloadImageUrlOptions & { delayMs?: number },
): Promise<void> {
  const delayMs = options?.delayMs ?? 280;
  const token = options?.idToken ?? null;
  const base = safeDownloadFilenameBase(baseFilename);
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]!;
    const video = isLikelyVideoUrl(url);
    const ext = extensionFromMediaUrlPath(url, video);
    await downloadImageUrl(url, `${base}-${i + 1}.${ext}`, { idToken: token });
    if (i < urls.length - 1 && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

function blobToFileDownload(blob: Blob, filename: string): void {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

/**
 * Descarrega média como ficheiro. Com sessão válida, usa `/api/media/download` (R2 sem CORS no browser).
 * Sem proxy ou em falha, tenta fetch directo; em último caso abre o URL num separador.
 */
export async function downloadImageUrl(
  url: string,
  filename: string,
  options?: DownloadImageUrlOptions,
): Promise<void> {
  const token = options?.idToken;
  if (token) {
    try {
      const params = new URLSearchParams({ url, filename });
      const res = await fetch(`/api/media/download?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        blobToFileDownload(blob, filename);
        return;
      }
    } catch {
      /* tentar vias seguintes */
    }
  }

  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("fetch");
    const blob = await res.blob();
    blobToFileDownload(blob, filename);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

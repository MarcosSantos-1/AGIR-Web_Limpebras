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
 * Descarrega média como ficheiro. Com sessão válida, usa `/api/media/download` (POST, com fallback GET).
 * Sem proxy ou em falha com token, não abre o URL num separador para evitar comportamento enganador em produção.
 */
export async function downloadImageUrl(
  url: string,
  filename: string,
  options?: DownloadImageUrlOptions,
): Promise<void> {
  const token = options?.idToken;
  if (token) {
    const tries: Array<() => Promise<Response>> = [
      () =>
        fetch("/api/media/download", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, filename }),
        }),
      () =>
        fetch(
          `/api/media/download?${new URLSearchParams({ url, filename }).toString()}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
    ];

    let lastStatus = 0;
    for (const run of tries) {
      try {
        const res = await run();
        lastStatus = res.status;
        if (res.ok) {
          const blob = await res.blob();
          blobToFileDownload(blob, filename);
          return;
        }
      } catch {
        /* tentar seguinte */
      }
    }

    if (lastStatus > 0 && typeof window !== "undefined") {
      console.warn(
        "[download] proxy falhou (HTTP",
        lastStatus,
        "). Confirme no servidor: FIREBASE_SERVICE_ACCOUNT_JSON, R2_PUBLIC_BASE_URL (origin igual ao URL do ficheiro; pode listar várias bases separadas por vírgula).",
      );
    }
    return;
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

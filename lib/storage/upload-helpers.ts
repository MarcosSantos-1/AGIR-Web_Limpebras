import { getFirebaseAuth } from "@/lib/firebase";
import { revokeBlobPhotoUrls } from "@/lib/storage/photo-url-helpers";

/**
 * Converte data URL em Blob (browser).
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("data URL inválida");
  const header = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mimeMatch = /data:([^;]+)/.exec(header);
  const mime = mimeMatch?.[1] ?? "application/octet-stream";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/** Extensão de ficheiro para upload (MIME → ext). */
export function extensionForMime(mime: string): string {
  const m = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  if (m === "image/jpeg") return "jpg";
  if (m.startsWith("image/")) {
    const sub = m.slice("image/".length).replace(/[^a-z0-9]/g, "");
    if (sub === "jpeg") return "jpg";
    return sub || "img";
  }
  if (m === "video/quicktime") return "mov";
  if (m.startsWith("video/")) {
    const sub = m.slice("video/".length).replace(/[^a-z0-9]/g, "");
    return sub || "mp4";
  }
  return "bin";
}

function extensionForDataUrl(dataUrl: string): string {
  const m = /^data:image\/(\w+);/i.exec(dataUrl);
  if (m?.[1]) {
    const ext = m[1].toLowerCase();
    if (ext === "jpeg") return "jpg";
    return ext;
  }
  if (/^data:video\//i.test(dataUrl)) return "mp4";
  return "bin";
}

export async function uploadBlobToObjectKey(
  objectKey: string,
  blob: Blob,
  filenameForForm: string,
): Promise<string> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Inicie sessão para enviar ficheiros.");
  }

  const token = await user.getIdToken(true);
  const form = new FormData();
  form.append("key", objectKey);
  form.append("file", blob, filenameForForm);

  const res = await fetch("/api/storage/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };

  if (!res.ok) {
    throw new Error(data.error || `Upload falhou (${res.status}).`);
  }
  if (typeof data.url !== "string" || !data.url) {
    throw new Error("Resposta inválida do servidor.");
  }
  return data.url;
}

export async function uploadDataUrlToPath(
  path: string,
  dataUrl: string,
): Promise<string> {
  if (!dataUrl.startsWith("data:")) {
    return dataUrl;
  }
  const blob = dataUrlToBlob(dataUrl);
  const ext = extensionForDataUrl(dataUrl);
  return uploadBlobToObjectKey(path, blob, `upload.${ext}`);
}

export async function uploadFileToPath(path: string, file: File): Promise<string> {
  const name =
    file.name?.replace(/[^\w.-]/g, "_").slice(0, 120) || "upload";
  return uploadBlobToObjectKey(path, file, name);
}

/**
 * Mantém URLs remotas (http/https); envia `blob:` como Blob e `data:` via upload existente.
 */
export async function replaceDataUrlsWithStorage(
  urls: string[] | undefined,
  pathPrefix: string,
): Promise<string[] | undefined> {
  if (!urls?.length) return urls;
  const out: string[] = [];
  try {
    for (const u of urls) {
      if (u.startsWith("blob:")) {
        const res = await fetch(u);
        const blob = await res.blob();
        const ext = extensionForMime(blob.type || "application/octet-stream");
        const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;
        out.push(
          await uploadBlobToObjectKey(path, blob, `upload.${ext}`),
        );
      } else if (u.startsWith("data:")) {
        const ext = extensionForDataUrl(u);
        const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;
        out.push(await uploadDataUrlToPath(path, u));
      } else {
        out.push(u);
      }
    }
  } finally {
    revokeBlobPhotoUrls(urls);
  }
  return out;
}

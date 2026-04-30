import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseStorage } from "@/lib/firebase";

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

export async function uploadDataUrlToPath(
  path: string,
  dataUrl: string,
): Promise<string> {
  if (!dataUrl.startsWith("data:")) {
    return dataUrl;
  }
  const blob = dataUrlToBlob(dataUrl);
  const storage = getFirebaseStorage();
  const r = ref(storage, path);
  await uploadBytes(r, blob);
  return getDownloadURL(r);
}

export async function uploadFileToPath(path: string, file: File): Promise<string> {
  const storage = getFirebaseStorage();
  const r = ref(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}

/**
 * Mantém URLs já remotas; faz upload de cada data URL sob pathPrefix/uuid.ext
 */
export async function replaceDataUrlsWithStorage(
  urls: string[] | undefined,
  pathPrefix: string,
): Promise<string[] | undefined> {
  if (!urls?.length) return urls;
  const out: string[] = [];
  for (const u of urls) {
    if (u.startsWith("data:")) {
      const ext = extensionForDataUrl(u);
      const path = `${pathPrefix}/${crypto.randomUUID()}.${ext}`;
      out.push(await uploadDataUrlToPath(path, u));
    } else {
      out.push(u);
    }
  }
  return out;
}

/**
 * Revoga URLs criadas com URL.createObjectURL (pré-visualização no browser).
 */
export function revokeBlobPhotoUrls(urls: readonly string[] | undefined): void {
  if (!urls?.length) return;
  for (const u of urls) {
    if (u.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(u);
      } catch {
        /* noop */
      }
    }
  }
}

async function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () =>
      reject(new Error("Não foi possível ler a imagem para envio."));
    r.readAsDataURL(blob);
  });
}

/**
 * Converte `blob:` de pré-visualização em data URLs para persistência / R2.
 * Mantém `data:` e URLs http(s) inalteradas.
 */
export async function resolvePhotoUrlsForPersist(
  urls: string[],
): Promise<string[]> {
  const out: string[] = [];
  for (const u of urls) {
    if (u.startsWith("blob:")) {
      out.push(await blobUrlToDataUrl(u));
    } else {
      out.push(u);
    }
  }
  return out;
}

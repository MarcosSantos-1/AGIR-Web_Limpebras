const MAX_EDGE_PX = 2560;
const JPEG_QUALITY = 0.87;
const WEBP_QUALITY = 0.87;
/** Só tentar comprimir acima disto (evita reencode de miniaturas). */
const MIN_BYTES_FOR_COMPRESS = 350 * 1024;

function mimeForOutput(inputMime: string): "image/jpeg" | "image/webp" {
  if (inputMime === "image/webp") return "image/webp";
  return "image/jpeg";
}

/**
 * Redimensiona imagens grandes e/ou pesadas antes do upload (browser).
 * Devolve o ficheiro original se não for imagem suportada, se falhar, ou se o resultado for maior.
 */
export async function compressImageFileIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }
  if (file.type === "image/gif") {
    return file;
  }

  const needsBySize = file.size >= MIN_BYTES_FOR_COMPRESS;

  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const w = bmp.width;
    const h = bmp.height;
    const maxEdge = Math.max(w, h);
    const needsByDimensions = maxEdge > MAX_EDGE_PX;
    if (!needsBySize && !needsByDimensions) {
      bmp.close();
      return file;
    }

    const scale = needsByDimensions ? MAX_EDGE_PX / maxEdge : 1;
    const outW = Math.round(w * scale);
    const outH = Math.round(h * scale);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close();
      return file;
    }
    ctx.drawImage(bmp, 0, 0, outW, outH);
    bmp.close();

    const outMime = mimeForOutput(file.type);
    const quality = outMime === "image/webp" ? WEBP_QUALITY : JPEG_QUALITY;

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), outMime, quality),
    );
    if (!blob || blob.size >= file.size) {
      return file;
    }

    const base =
      file.name?.replace(/[^\w.-]/g, "_").replace(/\.[^.]+$/, "") ||
      "photo";
    const ext = outMime === "image/webp" ? "webp" : "jpg";
    return new File([blob], `${base}.${ext}`, {
      type: outMime,
      lastModified: Date.now(),
    });
  } catch {
    try {
      bmp.close();
    } catch {
      /* ignore */
    }
    return file;
  }
}

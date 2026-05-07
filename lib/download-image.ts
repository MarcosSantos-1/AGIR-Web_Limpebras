/**
 * Tenta descarregar uma imagem remota como ficheiro; se CORS falhar, abre num separador.
 */
export async function downloadImageUrl(
  url: string,
  filename: string,
): Promise<void> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("fetch");
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

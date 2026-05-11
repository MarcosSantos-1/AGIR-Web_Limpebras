import type { SocialPost } from "@/data/social-posts";

/**
 * URLs hospedadas no armazenamento da app (R2): mídias do card e arquivo de apoio
 * anexado (quando for https). Links externos (rede social, PDF em outro domínio) não entram.
 */
export function collectStorageCandidateUrls(post: SocialPost): string[] {
  const urls: string[] = [];
  for (const foto of post.fotos ?? []) {
    const u = foto.url?.trim();
    if (u && u.startsWith("https:")) urls.push(u);
  }
  const arquivo = post.linkOuArquivo?.trim();
  if (arquivo && arquivo.startsWith("https:")) urls.push(arquivo);
  return [...new Set(urls)];
}

import { File } from "expo-file-system";
import { getFirebaseAuth } from "@/lib/firebase";

export function agirApiBase() {
  const raw = process.env.EXPO_PUBLIC_AGIR_API_URL;
  return typeof raw === "string" ? raw.replace(/\/$/, "") : "";
}

async function authorizedFetch(path: string, init: RequestInit, refresh = false) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Entre na sua conta para enviar arquivos.");
  const base = agirApiBase();
  if (!base) throw new Error("Defina EXPO_PUBLIC_AGIR_API_URL com o endereço do AGIR para enviar fotos.");
  const token = await user.getIdToken(refresh);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  if (response.status === 401 && !refresh) return authorizedFetch(path, init, true);
  return response;
}

async function readError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return typeof body.error === "string" ? body.error : fallback;
}

export async function uploadDiagnosticPhoto(objectKey: string, uri: string, mime: string) {
  const name = objectKey.split("/").pop() || "foto.jpg";
  const form = new FormData();
  form.append("key", objectKey);
  // O fetch global do Expo (SDK 58) não aceita o formato antigo `{ uri, name, type }` do
  // React Native ("Unsupported FormDataPart implementation"). Ele aceita um objeto com `bytes()`.
  const file = new File(uri);
  form.append("file", { name, type: mime, bytes: () => file.bytes() } as unknown as Blob);
  const response = await authorizedFetch("/api/storage/upload", { method: "POST", body: form });
  if (!response.ok) throw new Error(await readError(response, "Não foi possível enviar a foto."));
  const body = (await response.json()) as { url?: string };
  if (!body.url) throw new Error("O servidor não devolveu o endereço da foto.");
  return body.url;
}

export async function deleteStoredFilesByPublicUrls(urls: string[]) {
  const unique = [...new Set(urls.filter(Boolean))];
  if (!unique.length) return;
  const response = await authorizedFetch("/api/storage/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls: unique.slice(0, 500) }),
  });
  if (!response.ok) throw new Error(await readError(response, "Não foi possível remover fotos antigas."));
}

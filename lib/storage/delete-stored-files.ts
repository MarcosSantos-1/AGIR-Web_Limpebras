import { getFirebaseAuth } from "@/lib/firebase";

/** Remove objetos públicos reconhecidos da configuração R2 (URLs sob R2_PUBLIC_BASE_URL). */
export async function deleteStoredFilesByPublicUrls(
  urls: string[],
): Promise<void> {
  const unique = [...new Set(urls.filter(Boolean))];
  if (unique.length === 0) return;

  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Inicie sessão para excluir ficheiros.");
  }

  const token = await user.getIdToken(true);
  const res = await fetch("/api/storage/delete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ urls: unique.slice(0, 500) }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    deletedKeys?: unknown;
  };

  if (!res.ok) {
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : `Falha ao remover ficheiros (${res.status}).`,
    );
  }
}

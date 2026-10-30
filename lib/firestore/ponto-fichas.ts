import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { normalizePontoViciadoCodigo } from "@/lib/ponto-viciado-codigo";
import { emptyFichaDraft, type FichaAnswerKey, type PontoFichaDraft, FICHA_ANSWER_KEYS } from "@/lib/ponto-ficha";

export const PONTO_FICHAS_COLLECTION = "pontoFichas";

function asDraft(data: Record<string, unknown>): PontoFichaDraft {
  const draft = emptyFichaDraft();
  for (const key of FICHA_ANSWER_KEYS) {
    const value = data[key];
    if (typeof value === "string") draft[key as FichaAnswerKey] = value;
  }
  return draft;
}

export function subscribePontoFichas(next: (items: Map<string, PontoFichaDraft>) => void, error: (error: Error) => void): Unsubscribe {
  return onSnapshot(collection(getFirebaseDb(), PONTO_FICHAS_COLLECTION), (snapshot) => {
    const items = new Map<string, PontoFichaDraft>();
    for (const item of snapshot.docs) {
      const data = item.data() as Record<string, unknown>;
      const codigo = normalizePontoViciadoCodigo(typeof data.codigo === "string" ? data.codigo : item.id);
      if (codigo) items.set(codigo, asDraft(data));
    }
    next(items);
  }, error);
}

export async function getPontoFicha(codigo: string): Promise<PontoFichaDraft | null> {
  const id = normalizePontoViciadoCodigo(codigo);
  if (!id) return null;
  const snapshot = await getDoc(doc(getFirebaseDb(), PONTO_FICHAS_COLLECTION, id));
  if (!snapshot.exists()) return null;
  return asDraft(snapshot.data() as Record<string, unknown>);
}

export async function savePontoFicha(codigo: string, draft: PontoFichaDraft) {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Entre na sua conta para salvar a ficha do ponto.");
  const id = normalizePontoViciadoCodigo(codigo);
  if (!id) throw new Error("Informe o código do ponto.");
  const payload: Record<string, string | number> = { codigo: id, updatedAtMs: Date.now(), updatedByUid: uid };
  for (const key of FICHA_ANSWER_KEYS) payload[key] = draft[key].trim();
  await setDoc(doc(getFirebaseDb(), PONTO_FICHAS_COLLECTION, id), payload);
}

export async function deletePontoFicha(codigo: string) {
  const id = normalizePontoViciadoCodigo(codigo);
  if (!id) return;
  await deleteDoc(doc(getFirebaseDb(), PONTO_FICHAS_COLLECTION, id));
}

import { collection, deleteDoc, doc, getDoc, onSnapshot, query, setDoc, where, type Unsubscribe } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { normalizePontoViciadoCodigo } from "@/lib/ponto-viciado-codigo";
import { emptyFichaDraft, FICHA_ANSWER_KEYS, type FichaAnswerKey, type PontoFichaDraft } from "@/lib/ponto-ficha";

/** Mesma coleção já liberada para quem está logado. Evita uma coleção nova sem regra publicada. */
const SETTINGS = "appSettings";
const FICHA_TYPE = "ponto-ficha";

function fichaDocId(codigo: string) {
  return `ponto-ficha-${codigo}`;
}

function asDraft(data: Record<string, unknown>): PontoFichaDraft {
  const draft = emptyFichaDraft();
  for (const key of FICHA_ANSWER_KEYS) {
    const value = data[key];
    if (typeof value === "string") draft[key as FichaAnswerKey] = value;
  }
  return draft;
}

export function subscribePontoFichas(next: (items: Map<string, PontoFichaDraft>) => void, error: (error: Error) => void): Unsubscribe {
  return onSnapshot(query(collection(getFirebaseDb(), SETTINGS), where("type", "==", FICHA_TYPE)), (snapshot) => {
    const items = new Map<string, PontoFichaDraft>();
    for (const item of snapshot.docs) {
      const data = item.data() as Record<string, unknown>;
      const codigo = normalizePontoViciadoCodigo(typeof data.codigo === "string" ? data.codigo : "");
      if (codigo) items.set(codigo, asDraft(data));
    }
    next(items);
  }, error);
}

export async function getPontoFicha(codigo: string): Promise<PontoFichaDraft | null> {
  const id = normalizePontoViciadoCodigo(codigo);
  if (!id) return null;
  const snapshot = await getDoc(doc(getFirebaseDb(), SETTINGS, fichaDocId(id)));
  if (!snapshot.exists() || snapshot.data().type !== FICHA_TYPE) return null;
  return asDraft(snapshot.data() as Record<string, unknown>);
}

export async function savePontoFicha(codigo: string, draft: PontoFichaDraft) {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Entre na sua conta para salvar a ficha do ponto.");
  const id = normalizePontoViciadoCodigo(codigo);
  if (!id) throw new Error("Informe o código do ponto.");
  const payload: Record<string, string | number> = { type: FICHA_TYPE, codigo: id, updatedAtMs: Date.now(), updatedByUid: uid };
  for (const key of FICHA_ANSWER_KEYS) payload[key] = draft[key].trim();
  await setDoc(doc(getFirebaseDb(), SETTINGS, fichaDocId(id)), payload);
}

export async function deletePontoFicha(codigo: string) {
  const id = normalizePontoViciadoCodigo(codigo);
  if (!id) return;
  await deleteDoc(doc(getFirebaseDb(), SETTINGS, fichaDocId(id)));
}

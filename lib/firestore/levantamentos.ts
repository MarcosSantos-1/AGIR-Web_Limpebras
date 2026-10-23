import { collection, doc, onSnapshot, query, runTransaction, where } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import type { Diagnostic } from "@/lib/diagnosticos";
import type { Levantamento } from "@/lib/levantamentos";

export function subscribeLevantamentos(next: (items: Levantamento[]) => void, error: (error: Error) => void) {
  return onSnapshot(query(collection(getFirebaseDb(), "appSettings"), where("type", "==", "diagnostico-levantamento")),
    (snapshot) => next(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as Levantamento)), error);
}
export function subscribeQuarterlyDiagnostics(next: (items: Diagnostic[]) => void, error: (error: Error) => void) {
  return onSnapshot(query(collection(getFirebaseDb(), "diagnosticos"), where("kind", "==", "trimestral")),
    (snapshot) => next(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as Diagnostic)), error);
}
export async function saveLevantamento(record: Levantamento) {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Entre na sua conta para atualizar o levantamento.");
  const db = getFirebaseDb();
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "appSettings", record.id);
    const current = await tx.get(ref);
    if ((current.exists() ? current.data().revision : 0) !== record.revision) throw new Error("O levantamento foi atualizado por outra pessoa. Abra novamente para editar.");
    tx.set(ref, { ...record, type: "diagnostico-levantamento", revision: record.revision + 1, updatedByUid: uid, updatedAtMs: Date.now() });
  });
}

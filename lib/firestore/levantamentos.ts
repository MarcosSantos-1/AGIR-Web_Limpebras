import { collection, doc, getDocs, onSnapshot, query, runTransaction, where } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import type { Diagnostic } from "@/lib/diagnosticos";
import type { Levantamento } from "@/lib/levantamentos";
import { assertSingleOpenSurvey, assertZeroCompleted } from "@/lib/survey-lifecycle";

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
  const existing = await getDocs(query(collection(db, "appSettings"), where("type", "==", "diagnostico-levantamento")));
  if (record.status === "em-preenchimento") assertSingleOpenSurvey(record.id, existing.docs.map((d) => ({ id: d.id, status: d.data().status })));
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "appSettings", record.id);
    const current = await tx.get(ref);
    const lockRef = doc(db, "appSettings", "diagnostico-active-levantamento");
    const lock = await tx.get(lockRef);
    if (record.status === "em-preenchimento" && lock.exists() && lock.data().activeId && lock.data().activeId !== record.id) {
      const active = await tx.get(doc(db, "appSettings", lock.data().activeId));
      if (active.exists() && active.data().status === "em-preenchimento") throw new Error("Outro levantamento foi iniciado. Atualize a página.");
    }
    if ((current.exists() ? current.data().revision : 0) !== record.revision) throw new Error("O levantamento foi atualizado por outra pessoa. Abra novamente para editar.");
    tx.set(ref, { ...record, type: "diagnostico-levantamento", revision: record.revision + 1, updatedByUid: uid, updatedAtMs: Date.now() });
    if (record.status === "em-preenchimento") tx.set(lockRef, { activeId: record.id });
    else if (lock.data()?.activeId === record.id) tx.set(lockRef, { activeId: null });
  });
}

export async function enrollSurveyPoints(id: string, codes: string[]) {
  const db = getFirebaseDb();
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "appSettings", id); const snap = await tx.get(ref);
    if (!snap.exists() || snap.data().status !== "em-preenchimento" || snap.data().sourceId) return;
    const existing: string[] = snap.data().expectedCodes ?? [];
    const combined = [...new Set([...existing, ...codes])];
    if (combined.length !== existing.length) tx.update(ref, { expectedCodes: combined, revision: snap.data().revision + 1, updatedAtMs: Date.now() });
  });
}

export async function cancelLevantamento(record: Levantamento) {
  const db = getFirebaseDb();
  const saved = await getDocs(query(collection(db, "diagnosticos"), where("sourceId", "==", record.sourceId ?? record.id)));
  assertZeroCompleted(saved.docs.filter((d) => d.data().state === "concluido").length);
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "appSettings", record.id); const current = await tx.get(ref);
    const lockRef = doc(db, "appSettings", "diagnostico-active-levantamento"); const lock = await tx.get(lockRef);
    if (!current.exists() || current.data().status !== "em-preenchimento") throw new Error("O levantamento não está mais em preenchimento.");
    assertZeroCompleted(current.data().completedCodes?.length ?? 0);
    tx.update(ref, { status: current.data().sourceId ? "concluido" : "cancelado", revision: current.data().revision + 1, updatedAtMs: Date.now() });
    if (lock.data()?.activeId === record.id) tx.set(lockRef, { activeId: null });
  });
}

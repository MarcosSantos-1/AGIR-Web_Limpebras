import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { HistoryRecordDoc } from "@/data/history-records";
import { getFirebaseDb } from "@/lib/firebase";

export const HISTORY_COLLECTION = "historyRecords";

function docToHistory(
  docId: string,
  data: Record<string, unknown>,
): HistoryRecordDoc {
  const id =
    typeof data.id === "number" ? data.id : Number(docId.replace(/\D/g, "")) || Number(docId);
  return { ...data, id } as HistoryRecordDoc;
}

export function subscribeHistoryRecords(
  onNext: (records: HistoryRecordDoc[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const col = collection(db, HISTORY_COLLECTION);
  return onSnapshot(
    col,
    (snap) => {
      const rows = snap.docs
        .map((d) => docToHistory(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
      onNext(rows);
    },
    (err) => onError?.(err as Error),
  );
}

function scrub(obj: Record<string, unknown>): Record<string, unknown> {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

export async function replaceHistoryDoc(rec: HistoryRecordDoc): Promise<void> {
  const db = getFirebaseDb();
  const r = doc(db, HISTORY_COLLECTION, String(rec.id));
  const payload = scrub({ ...rec } as unknown as Record<string, unknown>);
  await setDoc(r, payload, { merge: true });
}

export async function deleteHistoryRecord(id: number): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, HISTORY_COLLECTION, String(id)));
}

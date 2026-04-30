import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { GaleriaSetDoc } from "@/data/gallery-sets";
import { getFirebaseDb } from "@/lib/firebase";

export const GALERIA_COLLECTION = "galeriaSets";

function docToSet(
  docId: string,
  data: Record<string, unknown>,
): GaleriaSetDoc {
  const id =
    typeof data.id === "number" ? data.id : Number(docId.replace(/\D/g, "")) || Number(docId);
  return { ...data, id } as GaleriaSetDoc;
}

export function subscribeGaleriaSets(
  onNext: (sets: GaleriaSetDoc[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const col = collection(db, GALERIA_COLLECTION);
  return onSnapshot(
    col,
    (snap) => {
      const sets = snap.docs
        .map((d) => docToSet(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
      onNext(sets);
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

export async function replaceGaleriaSetDoc(set: GaleriaSetDoc): Promise<void> {
  const db = getFirebaseDb();
  const r = doc(db, GALERIA_COLLECTION, String(set.id));
  await setDoc(r, scrub({ ...set } as unknown as Record<string, unknown>), {
    merge: true,
  });
}

export async function deleteGaleriaSet(id: number): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, GALERIA_COLLECTION, String(id)));
}

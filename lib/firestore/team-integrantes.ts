import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export const TEAM_INTEGRANTES_COLLECTION = "teamIntegrantes";

export type TeamIntegranteDoc = {
  id: string;
  nome: string;
  createdAtMs: number;
  createdByUid?: string;
};

function docToIntegrante(
  docId: string,
  data: Record<string, unknown>,
): TeamIntegranteDoc {
  return {
    id: docId,
    nome: typeof data.nome === "string" ? data.nome : "",
    createdAtMs:
      typeof data.createdAtMs === "number" ? data.createdAtMs : Date.now(),
    createdByUid:
      typeof data.createdByUid === "string" ? data.createdByUid : undefined,
  };
}

export function subscribeTeamIntegrantes(
  onNext: (rows: TeamIntegranteDoc[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const col = collection(db, TEAM_INTEGRANTES_COLLECTION);
  return onSnapshot(
    col,
    (snap) => {
      const rows = snap.docs
        .map((d) => docToIntegrante(d.id, d.data() as Record<string, unknown>))
        .filter((r) => r.nome.trim())
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      onNext(rows);
    },
    (err) => onError?.(err as Error),
  );
}

function scrubUndefined(o: Record<string, unknown>): Record<string, unknown> {
  const out = { ...o };
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

export async function createTeamIntegrante(
  nome: string,
  createdByUid: string,
): Promise<string> {
  const db = getFirebaseDb();
  const ref = doc(collection(db, TEAM_INTEGRANTES_COLLECTION));
  const payload: TeamIntegranteDoc = {
    id: ref.id,
    nome: nome.trim(),
    createdAtMs: Date.now(),
    createdByUid,
  };
  await setDoc(ref, scrubUndefined({ ...payload } as Record<string, unknown>));
  return ref.id;
}

export async function deleteTeamIntegrante(id: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, TEAM_INTEGRANTES_COLLECTION, id));
}

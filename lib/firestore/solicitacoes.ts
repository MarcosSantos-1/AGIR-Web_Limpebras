import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import {
  isSolicitacaoStatus,
  isSolicitacaoTipo,
  SOLICITACOES_COLLECTION,
  sortSolicitacoes,
  type Solicitacao,
  type SolicitacaoStatus,
} from "@/data/solicitacoes";

function docToSolicitacao(
  docId: string,
  data: Record<string, unknown>,
): Solicitacao {
  const tipoRaw = typeof data.tipo === "string" ? data.tipo : "outro";
  const statusRaw = typeof data.status === "string" ? data.status : "nova";
  return {
    ...data,
    id: docId,
    tipo: isSolicitacaoTipo(tipoRaw) ? tipoRaw : "outro",
    status: isSolicitacaoStatus(statusRaw) ? statusRaw : "nova",
    createdAtMs: typeof data.createdAtMs === "number" ? data.createdAtMs : 0,
  } as Solicitacao;
}

export function subscribeSolicitacoes(
  onNext: (solicitacoes: Solicitacao[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  return onSnapshot(
    collection(db, SOLICITACOES_COLLECTION),
    (snap) => {
      const list = snap.docs
        .map((d) => docToSolicitacao(d.id, d.data() as Record<string, unknown>))
        .sort(sortSolicitacoes);
      onNext(list);
    },
    (err) => onError?.(err as Error),
  );
}

export async function fetchAllSolicitacoes(): Promise<Solicitacao[]> {
  const db = getFirebaseDb();
  const snapshot = await getDocs(collection(db, SOLICITACOES_COLLECTION));
  return snapshot.docs
    .map((d) => docToSolicitacao(d.id, d.data() as Record<string, unknown>))
    .sort(sortSolicitacoes);
}

export type SolicitacaoStatusPatch = {
  status: SolicitacaoStatus;
  responsavelUid?: string;
  responsavelNome?: string;
  respostaInterna?: string;
};

export async function updateSolicitacaoStatus(
  id: string,
  patch: SolicitacaoStatusPatch,
): Promise<void> {
  const db = getFirebaseDb();
  const payload: Record<string, unknown> = {
    status: patch.status,
    updatedAtMs: Date.now(),
  };
  if (patch.responsavelUid !== undefined) {
    payload.responsavelUid = patch.responsavelUid;
  }
  if (patch.responsavelNome !== undefined) {
    payload.responsavelNome = patch.responsavelNome;
  }
  if (patch.respostaInterna !== undefined) {
    payload.respostaInterna = patch.respostaInterna;
  }
  await setDoc(doc(db, SOLICITACOES_COLLECTION, id), payload, { merge: true });
}

export async function deleteSolicitacao(id: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, SOLICITACOES_COLLECTION, id));
}

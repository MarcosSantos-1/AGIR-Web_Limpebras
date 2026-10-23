import * as admin from "firebase-admin";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import {
  SOLICITACOES_COLLECTION,
  type Solicitacao,
} from "@/data/solicitacoes";

/**
 * Escrita de solicitações pelo lado do bot (Admin SDK, sem utilizador autenticado).
 * A leitura e a mudança de estado no AGIR ficam em `lib/firestore/solicitacoes.ts`.
 */

const COUNTERS_COLLECTION = "solicitacoesCounters";

function db(): admin.firestore.Firestore {
  return admin.firestore(getFirebaseAdminApp());
}

export type NewSolicitacaoInput = Omit<
  Solicitacao,
  "id" | "protocolo" | "status" | "createdAtMs" | "updatedAtMs"
>;

/**
 * Sequência por ano numa transação: garante protocolos únicos mesmo com duas
 * solicitações a chegar no mesmo instante.
 */
async function allocateProtocolo(year: number): Promise<string> {
  const ref = db().collection(COUNTERS_COLLECTION).doc(String(year));
  const seq = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? Number(snap.data()?.seq ?? 0) : 0;
    const next = Number.isFinite(current) ? current + 1 : 1;
    tx.set(ref, { seq: next, updatedAtMs: Date.now() });
    return next;
  });
  return `SOL-${year}-${String(seq).padStart(4, "0")}`;
}

export async function createSolicitacao(
  input: NewSolicitacaoInput,
): Promise<{ id: string; protocolo: string }> {
  const createdAtMs = Date.now();
  const protocolo = await allocateProtocolo(new Date(createdAtMs).getFullYear());

  const payload: Record<string, unknown> = {
    protocolo,
    tipo: input.tipo,
    descricao: input.descricao,
    prazoTipo: input.prazoTipo,
    urgencia: input.urgencia,
    solicitanteNome: input.solicitanteNome,
    solicitanteSetor: input.solicitanteSetor,
    solicitanteTelefone: input.solicitanteTelefone,
    canal: input.canal,
    status: "nova",
    createdAtMs,
  };
  if (input.prazoData) payload.prazoData = input.prazoData;

  const ref = await db().collection(SOLICITACOES_COLLECTION).add(payload);
  return { id: ref.id, protocolo };
}

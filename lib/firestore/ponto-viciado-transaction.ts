import * as admin from "firebase-admin";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";

const POINTS_COLLECTION = "customPontosViciados";
const ALREADY_EXISTS = 6;
const MAX_RETRIES = 4;

export type PointData = Record<string, string | number | boolean>;

export type PointDocument = {
  /** Caminho completo do documento, por exemplo `customPontosViciados/CV-001`. */
  path: string;
  data: PointData;
};

export type PointWrite =
  | { delete: string }
  | { set: string; data: PointData; /** O documento ainda não existe: falha se alguém o criar antes. */ create?: boolean };

/**
 * Lê os pontos cadastrados e aplica as gravações de `apply` na mesma transação.
 *
 * Usa o Firebase Admin (credencial do servidor), então não depende das regras de
 * segurança do Firestore. A rota já exige e valida o token do usuário antes de chegar aqui.
 * `apply` pode rodar mais de uma vez quando há conflito, por isso precisa ser pura.
 */
export async function withPontoViciadoDocuments<T>(
  readOnly: boolean,
  apply: (docs: PointDocument[], writes: PointWrite[]) => T,
): Promise<T> {
  const db = admin.firestore(getFirebaseAdminApp());
  const toDocuments = (snapshot: admin.firestore.QuerySnapshot): PointDocument[] =>
    snapshot.docs.map((doc) => ({ path: doc.ref.path, data: doc.data() as PointData }));

  if (readOnly) {
    return apply(toDocuments(await db.collection(POINTS_COLLECTION).get()), []);
  }

  for (let attempt = 0; ; attempt++) {
    try {
      return await db.runTransaction(async (tx) => {
        const writes: PointWrite[] = [];
        const result = apply(toDocuments(await tx.get(db.collection(POINTS_COLLECTION))), writes);
        for (const write of writes) {
          if ("delete" in write) tx.delete(db.doc(write.delete));
          else if (write.create) tx.create(db.doc(write.set), write.data);
          else tx.set(db.doc(write.set), write.data);
        }
        return result;
      });
    } catch (error) {
      // Outro usuário criou o mesmo ponto no meio do caminho: lê de novo e recalcula o ID.
      const code = (error as { code?: unknown }).code;
      if (code !== ALREADY_EXISTS || attempt >= MAX_RETRIES) throw error;
    }
  }
}

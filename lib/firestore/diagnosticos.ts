import { collection, doc, getDocs, onSnapshot, query, runTransaction, where } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { DIAGNOSTICOS_COLLECTION, diagnosticErrors, sortDiagnostics, type Diagnostic } from "@/lib/diagnosticos";
import catalog from "@/data/features-PV.json";

const catalogueCodes = new Set(catalog.features.map((point) => point.setor));

export function subscribeDiagnostics(period: string, next: (records: Diagnostic[]) => void, error: (error: Error) => void) {
  return onSnapshot(query(collection(getFirebaseDb(), DIAGNOSTICOS_COLLECTION), where("period", "==", period)),
    (snapshot) => next(snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as Diagnostic).sort(sortDiagnostics)), error);
}

export function subscribeDiagnosticsByPoint(pointId: string, next: (records: Diagnostic[]) => void, error: (error: Error) => void) {
  const code = pointId.trim();
  return onSnapshot(query(collection(getFirebaseDb(), DIAGNOSTICOS_COLLECTION), where("pointId", "==", code)),
    (snapshot) => next(snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as Diagnostic).sort(sortDiagnostics)), error);
}

export async function saveDiagnostic(record: Diagnostic, responsibleName: string) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Entre na sua conta para salvar.");
  const db = getFirebaseDb();
  const problems = diagnosticErrors(record, record.state === "concluido", record.source ? record : undefined);
  if (Object.keys(problems).length) throw new Error("Revise os campos indicados antes de salvar.");
  const ref = doc(db, DIAGNOSTICOS_COLLECTION, record.id);
  let newPointRef: ReturnType<typeof doc> | null = null;
  const { latitude, longitude } = record.answers;
  if (!record.source && !catalogueCodes.has(record.pointId) && typeof latitude === "number" && typeof longitude === "number" && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    const existing = await getDocs(query(collection(db, "customPontosViciados"), where("codigo", "==", record.pointId)));
    if (existing.empty) newPointRef = doc(db, "customPontosViciados", `diagnostico-${record.pointId}`);
  }
  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    const surveyRef = record.sourceId.startsWith("levantamento-") ? doc(getFirebaseDb(), "appSettings", record.sourceId) : null;
    const survey = surveyRef ? await tx.get(surveyRef) : null;
    const sharedPoint = newPointRef ? await tx.get(newPointRef) : null;
    if (surveyRef && (!survey?.exists() || survey.data().status !== "em-preenchimento")) throw new Error("Este levantamento está encerrado ou cancelado. Reabra o levantamento antes de preencher.");
    const original = snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } as Diagnostic : undefined;
    if (Object.keys(diagnosticErrors(record, record.state === "concluido", original)).length) throw new Error("Revise os campos sinalizados antes de salvar.");
    if ((snapshot.exists() ? snapshot.data().revision : 0) !== record.revision) throw new Error("Este diagnóstico foi alterado por outra pessoa. Feche e abra o registro novamente antes de editar.");
    if (!snapshot.exists() && record.revision > 0) throw new Error("O diagnóstico foi excluído por outra pessoa.");
    const now = Date.now();
    tx.set(ref, { ...record, pointId: String(record.answers.codigo).trim(), revision: record.revision + 1,
      responsibleName, updatedAtMs: now, updatedByUid: user.uid,
      createdAtMs: snapshot.exists() ? snapshot.data().createdAtMs : now,
      createdByUid: snapshot.exists() ? snapshot.data().createdByUid : user.uid });
    if (surveyRef && survey?.exists()) {
      const completed = new Set<string>(survey.data().completedCodes ?? []);
      if (snapshot.exists() && snapshot.data().pointId !== record.pointId) completed.delete(snapshot.data().pointId);
      if (record.state === "concluido") completed.add(record.pointId); else completed.delete(record.pointId);
      tx.update(surveyRef, { completedCodes: [...completed], expectedCodes: [...new Set<string>([...(survey.data().expectedCodes ?? []), record.pointId])], revision: survey.data().revision + 1, updatedAtMs: now });
    }
    if (newPointRef && sharedPoint && !sharedPoint.exists()) tx.set(newPointRef, { codigo: record.pointId, address: String(record.answers.endereco), subprefeitura: String(record.answers.subprefeitura ?? ""), lat: latitude, lng: longitude, createdByUid: user.uid, createdAtMs: now, updatedAtMs: now });
  });
}

export async function deleteDiagnostic(record: Diagnostic) {
  const ref = doc(getFirebaseDb(), DIAGNOSTICOS_COLLECTION, record.id);
  await runTransaction(getFirebaseDb(), async (tx) => {
    const snapshot = await tx.get(ref);
    const surveyRef = record.sourceId.startsWith("levantamento-") ? doc(getFirebaseDb(), "appSettings", record.sourceId) : null;
    const survey = surveyRef ? await tx.get(surveyRef) : null;
    if (!snapshot.exists()) throw new Error("O diagnóstico já foi excluído.");
    if (snapshot.data().revision !== record.revision) throw new Error("O registro foi alterado. Atualize a lista antes de excluir.");
    tx.delete(ref);
    if (surveyRef && survey?.exists()) tx.update(surveyRef, { completedCodes: (survey.data().completedCodes ?? []).filter((code: string) => code !== record.pointId), revision: survey.data().revision + 1, updatedAtMs: Date.now() });
  });
}

export async function historicalRequest(sourceId?: string, importRecords = false) {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Entre na sua conta para acessar os levantamentos.");
  const url = `/api/diagnosticos/historico${sourceId ? `?source=${encodeURIComponent(sourceId)}` : ""}`;
  const request = async (refresh: boolean) => fetch(url, {
    headers: { Authorization: `Bearer ${await user.getIdToken(refresh)}` }, cache: "no-store",
  });
  let response = await request(false);
  if (response.status === 401) response = await request(true);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Não foi possível acessar os levantamentos.");
  if (!importRecords) return result;
  if (!sourceId || !result.records?.length) throw new Error("Selecione uma fonte válida para importar.");
  return importHistoricalDiagnostics(result.records, user.uid);
}

/** Import through the signed-in user's Firestore session and security rules. */
export async function importHistoricalDiagnostics(records: Diagnostic[], uid: string) {
  const db = getFirebaseDb();
  let created = 0;
  try {
    for (let start = 0; start < records.length; start += 20) {
      const chunk = records.slice(start, start + 20);
      created += await runTransaction(db, async (tx) => {
        const refs = chunk.map((record) => doc(db, DIAGNOSTICOS_COLLECTION, record.id));
        const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
        let count = 0;
        snapshots.forEach((snapshot, index) => {
          if (snapshot.exists()) return;
          const now = Date.now();
          tx.set(refs[index], { ...chunk[index], revision: 1, createdAtMs: now, updatedAtMs: now,
            createdByUid: uid, updatedByUid: uid, responsibleName: "Importação histórica" });
          count++;
        });
        return count;
      });
    }
    return { created, skipped: records.length - created };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const reason = code === "permission-denied" ? "As regras do Firestore recusaram a gravação na coleção diagnosticos." : "Verifique a conexão e tente novamente.";
    throw new Error(`Importação interrompida após ${created} novos registros. ${reason} Os registros existentes serão preservados na próxima tentativa.`);
  }
}

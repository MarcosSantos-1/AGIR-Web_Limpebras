/**
 * Popular Firestore com os dados iniciais do repositório.
 *
 * Requer credenciais de serviço (não usar no cliente):
 *   set GOOGLE_APPLICATION_CREDENTIALS=c:\caminho\serviceAccount.json
 * ou
 *   set FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
 *
 * Executar: npm run seed:firestore
 */
import * as admin from "firebase-admin";
import { agendaEvents } from "../data/agenda-events";
import { socialPosts } from "../data/social-posts";
import { HISTORY_SEED } from "../data/history-records";
import { GALERIA_SEED } from "../data/gallery-sets";
import { getFirebaseAdminApp } from "../lib/firebase-admin";

async function main(): Promise<void> {
  getFirebaseAdminApp();
  const db = admin.firestore();

  for (const e of agendaEvents) {
    await db.collection("agendaEvents").doc(String(e.id)).set({ ...e }, { merge: true });
  }
  console.log(`agendaEvents: ${agendaEvents.length} documentos`);

  for (const p of socialPosts) {
    await db.collection("socialPosts").doc(String(p.id)).set({ ...p }, { merge: true });
  }
  console.log(`socialPosts: ${socialPosts.length} documentos`);

  for (const h of HISTORY_SEED) {
    await db.collection("historyRecords").doc(String(h.id)).set({ ...h }, { merge: true });
  }
  console.log(`historyRecords: ${HISTORY_SEED.length} documentos`);

  for (const g of GALERIA_SEED) {
    await db.collection("galeriaSets").doc(String(g.id)).set({ ...g }, { merge: true });
  }
  console.log(`galeriaSets: ${GALERIA_SEED.length} documentos`);

  console.log("Seed concluído.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

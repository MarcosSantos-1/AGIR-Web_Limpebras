import * as admin from "firebase-admin";
import { readFileSync } from "node:fs";

/**
 * Inicializa Firebase Admin uma única vez (Node / Route Handlers).
 * Usa as mesmas variáveis que `npm run seed:firestore`.
 */
export function getFirebaseAdminApp(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  /** Inline do `.env` tem prioridade — evita GOOGLE_APPLICATION_CREDENTIALS global (outro projeto) no Windows. */
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (inline) {
    const json = JSON.parse(inline);
    return admin.initializeApp({
      credential: admin.credential.cert(json as admin.ServiceAccount),
    });
  }

  if (path) {
    const json = JSON.parse(readFileSync(path, "utf8"));
    return admin.initializeApp({
      credential: admin.credential.cert(json as admin.ServiceAccount),
    });
  }

  throw new Error(
    "Firebase Admin não configurado: defina GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_SERVICE_ACCOUNT_JSON.",
  );
}

export async function verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  const app = getFirebaseAdminApp();
  return admin.auth(app).verifyIdToken(idToken);
}

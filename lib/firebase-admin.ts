import * as admin from "firebase-admin";
import { readFileSync } from "node:fs";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Inicializa Firebase Admin uma única vez (Node / Route Handlers).
 * Usa as mesmas variáveis que `npm run seed:firestore`.
 */
export function getFirebaseAdminApp(): admin.app.App {
  if (admin.apps.some((app) => app?.name === "[DEFAULT]")) {
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
  // Token verification uses Google's public certificates, not a service account.
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) throw new Error("FIREBASE_AUTH_PROJECT_MISSING");
  const name = `agir-token-verifier-${projectId}`;
  const app = getApps().find((item) => item.name === name) ?? initializeApp({ projectId }, name);
  return getAuth(app).verifyIdToken(idToken);
}

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
} as const;

function isConfigComplete(): boolean {
  return Object.values(config).every(
    (v): v is string => typeof v === "string" && v.length > 0
  );
}

/**
 * Aplicação Firebase (web). Chame a partir de componentes client ou ações
 * após preencher `.env.local` a partir de `.env.example`.
 * @throws Se variáveis obrigatórios estiverem em falta
 */
export function getFirebaseApp(): FirebaseApp {
  if (getApps().length) {
    return getApp();
  }
  if (!isConfigComplete()) {
    throw new Error(
      "Firebase não configurado: copie .env.example para .env.local e preencha NEXT_PUBLIC_FIREBASE_*."
    );
  }
  return initializeApp({
    apiKey: config.apiKey!,
    authDomain: config.authDomain!,
    projectId: config.projectId!,
    storageBucket: config.storageBucket!,
    messagingSenderId: config.messagingSenderId!,
    appId: config.appId!,
  });
}

export function isFirebaseConfigured(): boolean {
  return isConfigComplete();
}

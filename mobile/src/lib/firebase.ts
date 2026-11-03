import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth, type Persistence } from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured() {
  return Object.values(config).every((value) => typeof value === "string" && value.length > 0);
}

function firebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado. Preencha EXPO_PUBLIC_FIREBASE_* em mobile/.env.");
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

function asyncStoragePersistence(): Persistence {
  const persistence = class {
    static type = "LOCAL" as const;
    readonly type = "LOCAL" as const;
    async _isAvailable() { return true; }
    _set(key: string, value: unknown) { return AsyncStorage.setItem(key, JSON.stringify(value)); }
    async _get(key: string) {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return null;
      try { return JSON.parse(stored) as unknown; } catch { return null; }
    }
    async _remove(key: string) { await AsyncStorage.removeItem(key); }
    _addListener() {}
    _removeListener() {}
  };
  return persistence as unknown as Persistence;
}

let authSingleton: Auth | null = null;
let dbSingleton: Firestore | null = null;

export function getFirebaseAuth(): Auth {
  if (!authSingleton) {
    const app = firebaseApp();
    try {
      authSingleton = initializeAuth(app, { persistence: asyncStoragePersistence() });
    } catch {
      authSingleton = getAuth(app);
    }
  }
  return authSingleton;
}

export function getFirebaseDb(): Firestore {
  if (!dbSingleton) {
    const app = firebaseApp();
    try {
      dbSingleton = initializeFirestore(app, { experimentalForceLongPolling: true });
    } catch {
      dbSingleton = getFirestore(app);
    }
  }
  return dbSingleton;
}

import {
  doc,
  onSnapshot,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export const DEFAULT_PROFILE_GRADIENT = {
  from: "#f318e3",
  to: "#6a0eaf",
} as const;

export type UserProfileDoc = {
  nome: string;
  cargo: string;
  telefone: string;
  gradientFrom: string;
  gradientTo: string;
  /** E-mail atual do Auth (somente cópia informativa) */
  emailSynced: string | null;
  completedAtMs: number | null;
};

function coerceProfile(data: DocumentData): UserProfileDoc {
  return {
    nome: typeof data.nome === "string" ? data.nome : "",
    cargo: typeof data.cargo === "string" ? data.cargo : "",
    telefone: typeof data.telefone === "string" ? data.telefone : "",
    gradientFrom:
      typeof data.gradientFrom === "string"
        ? data.gradientFrom
        : DEFAULT_PROFILE_GRADIENT.from,
    gradientTo:
      typeof data.gradientTo === "string"
        ? data.gradientTo
        : DEFAULT_PROFILE_GRADIENT.to,
    emailSynced:
      typeof data.emailSynced === "string" ? data.emailSynced : null,
    completedAtMs:
      typeof data.completedAtMs === "number" ? data.completedAtMs : null,
  };
}

export function subscribeUserProfile(
  uid: string,
  onNext: (profile: UserProfileDoc | null) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onNext(null);
        return;
      }
      onNext(coerceProfile(snap.data()));
    },
    (err) => onError?.(err as Error),
  );
}

export type UserProfileWritable = {
  nome: string;
  cargo: string;
  telefone: string;
  gradientFrom: string;
  gradientTo: string;
};

export async function saveUserProfile(
  uid: string,
  email: string | null,
  writable: UserProfileWritable,
): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      nome: writable.nome.trim(),
      cargo: writable.cargo.trim(),
      telefone: writable.telefone.trim(),
      gradientFrom: writable.gradientFrom,
      gradientTo: writable.gradientTo,
      emailSynced: email ?? null,
      completedAtMs: Date.now(),
    },
    { merge: true },
  );
}

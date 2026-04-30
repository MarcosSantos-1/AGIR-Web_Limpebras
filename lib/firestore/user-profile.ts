import {
  collection,
  doc,
  getDocs,
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

export type AccessRole = "admin" | "standard";

export type UserProfileDoc = {
  nome: string;
  cargo: string;
  telefone: string;
  gradientFrom: string;
  gradientTo: string;
  /** E-mail atual do Auth (somente cópia informativa) */
  emailSynced: string | null;
  completedAtMs: number | null;
  accessRole: AccessRole;
};

function coerceAccessRole(v: unknown): AccessRole {
  return v === "admin" ? "admin" : "standard";
}

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
    accessRole: coerceAccessRole(data.accessRole),
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

/** Resumo para listagem (equipa / modais). */
export type UserDirectoryEntry = {
  uid: string;
  nome: string;
  emailSynced: string | null;
  accessRole: AccessRole;
};

export function displayNameFromDirectoryEntry(
  row: UserDirectoryEntry,
): string | null {
  const n = row.nome?.trim();
  if (n) return n;
  const e = row.emailSynced?.trim();
  if (e) {
    const local = e.split("@")[0]?.trim();
    if (local) return local;
  }
  return null;
}

export async function fetchUserDirectory(): Promise<UserDirectoryEntry[]> {
  const db = getFirebaseDb();
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => {
    const p = coerceProfile(d.data());
    return {
      uid: d.id,
      nome: p.nome,
      emailSynced: p.emailSynced,
      accessRole: p.accessRole,
    };
  });
}

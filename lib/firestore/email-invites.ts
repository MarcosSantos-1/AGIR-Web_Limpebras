import {
  collection,
  addDoc,
  type Unsubscribe,
  onSnapshot,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

export const EMAIL_INVITES_COLLECTION = "emailInvites";

export type EmailInviteDoc = {
  id: string;
  email: string;
  invitedByUid: string;
  invitedAtMs: number;
};

export async function logEmailInvite(
  email: string,
  invitedByUid: string,
): Promise<void> {
  const db = getFirebaseDb();
  await addDoc(collection(db, EMAIL_INVITES_COLLECTION), {
    email: email.trim().toLowerCase(),
    invitedByUid,
    invitedAtMs: Date.now(),
  });
}

export function subscribeEmailInvites(
  onNext: (rows: EmailInviteDoc[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  return onSnapshot(
    collection(db, EMAIL_INVITES_COLLECTION),
    (snap) => {
      onNext(
        snap.docs
          .map((d) => {
            const x = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              email: typeof x.email === "string" ? x.email : "",
              invitedByUid:
                typeof x.invitedByUid === "string" ? x.invitedByUid : "",
              invitedAtMs:
                typeof x.invitedAtMs === "number" ? x.invitedAtMs : 0,
            };
          })
          .sort((a, b) => b.invitedAtMs - a.invitedAtMs),
      );
    },
    (err) => onError?.(err as Error),
  );
}

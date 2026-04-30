import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { SocialPost } from "@/data/social-posts";
import { getFirebaseDb } from "@/lib/firebase";

export const SOCIAL_COLLECTION = "socialPosts";

function scrubUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

export function subscribeSocialPosts(
  onNext: (posts: SocialPost[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const col = collection(db, SOCIAL_COLLECTION);
  return onSnapshot(
    col,
    (snap) => {
      const posts = snap.docs
        .map((d) => d.data() as SocialPost)
        .sort((a, b) => Number(b.id) - Number(a.id));
      onNext(posts);
    },
    (err) => onError?.(err as Error),
  );
}

export async function persistSocialPost(post: SocialPost): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, SOCIAL_COLLECTION, String(post.id));
  const data = scrubUndefined({
    ...post,
  } as unknown as Record<string, unknown>);
  await setDoc(ref, data, { merge: true });
}

export async function deleteSocialPost(id: number): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, SOCIAL_COLLECTION, String(id)));
}

export function nextSocialPostId(posts: SocialPost[]): number {
  if (posts.length === 0) return 1;
  return Math.max(...posts.map((p) => Number(p.id))) + 1;
}

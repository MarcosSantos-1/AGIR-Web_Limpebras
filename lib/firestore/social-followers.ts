import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { SocialPublicationRede } from "@/data/social-posts";
import {
  DEFAULT_SOCIAL_FOLLOWER_COUNTS,
  type SocialFollowerCounts,
  type FollowerHistoryRow,
} from "@/data/social-followers";
import { getFirebaseDb } from "@/lib/firebase";

const COLLECTION = "appSettings";
const DOC_ID = "socialFollowerCounts";
const HISTORY_COLLECTION = "socialFollowerHistory";

const REDE_SET = new Set<string>(["facebook", "instagram", "linkedin"]);

function scrubUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

function num(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v));
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number.parseInt(v, 10);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return fallback;
}

function ms(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  return null;
}

export function yearMonthFromRecordedMs(recordedAtMs: number): string {
  const d = new Date(recordedAtMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function coerceSocialFollowerCounts(
  raw: Record<string, unknown> | undefined,
): SocialFollowerCounts {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SOCIAL_FOLLOWER_COUNTS };
  return {
    facebook: num(raw.followersFacebook, DEFAULT_SOCIAL_FOLLOWER_COUNTS.facebook),
    instagram: num(raw.followersInstagram, DEFAULT_SOCIAL_FOLLOWER_COUNTS.instagram),
    linkedin: num(raw.followersLinkedin, DEFAULT_SOCIAL_FOLLOWER_COUNTS.linkedin),
    atualizadoEmMsFacebook: ms(raw.updatedAtMsFacebook),
    atualizadoEmMsInstagram: ms(raw.updatedAtMsInstagram),
    atualizadoEmMsLinkedin: ms(raw.updatedAtMsLinkedin),
  };
}

function coerceHistoryDoc(
  id: string,
  raw: Record<string, unknown>,
): FollowerHistoryRow | null {
  const rede = raw.rede;
  if (typeof rede !== "string" || !REDE_SET.has(rede)) return null;
  const recordedAtMs = ms(raw.recordedAtMs);
  if (recordedAtMs == null) return null;
  const followers = num(raw.followers, 0);
  const yearMonth =
    typeof raw.yearMonth === "string" && /^\d{4}-\d{2}$/.test(raw.yearMonth)
      ? raw.yearMonth
      : yearMonthFromRecordedMs(recordedAtMs);
  return {
    id,
    rede: rede as SocialPublicationRede,
    followers,
    recordedAtMs,
    yearMonth,
  };
}

export function subscribeSocialFollowerCounts(
  onNext: (data: SocialFollowerCounts) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTION, DOC_ID);
  return onSnapshot(
    ref,
    (snap) => {
      const data = snap.exists()
        ? coerceSocialFollowerCounts(snap.data() as Record<string, unknown>)
        : { ...DEFAULT_SOCIAL_FOLLOWER_COUNTS };
      onNext(data);
    },
    (err) => onError?.(err as Error),
  );
}

export function subscribeSocialFollowerHistory(
  onNext: (rows: FollowerHistoryRow[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const q = query(
    collection(db, HISTORY_COLLECTION),
    orderBy("recordedAtMs", "asc"),
  );
  return onSnapshot(
    q,
    (snap) => {
      const rows: FollowerHistoryRow[] = [];
      for (const d of snap.docs) {
        const row = coerceHistoryDoc(d.id, d.data() as Record<string, unknown>);
        if (row) rows.push(row);
      }
      onNext(rows);
    },
    (err) => onError?.(err as Error),
  );
}

async function appendSocialFollowerHistoryEntry(params: {
  rede: SocialPublicationRede;
  followers: number;
  recordedAtMs: number;
}): Promise<void> {
  const db = getFirebaseDb();
  const yearMonth = yearMonthFromRecordedMs(params.recordedAtMs);
  await addDoc(collection(db, HISTORY_COLLECTION), {
    rede: params.rede,
    followers: params.followers,
    recordedAtMs: params.recordedAtMs,
    yearMonth,
  });
}

export async function updateSocialFollowerCount(
  rede: SocialPublicationRede,
  followers: number,
): Promise<void> {
  const n = Math.max(0, Math.floor(Number(followers)));
  const now = Date.now();
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTION, DOC_ID);
  const payload: Record<string, unknown> = {};
  if (rede === "facebook") {
    payload.followersFacebook = n;
    payload.updatedAtMsFacebook = now;
  } else if (rede === "instagram") {
    payload.followersInstagram = n;
    payload.updatedAtMsInstagram = now;
  } else {
    payload.followersLinkedin = n;
    payload.updatedAtMsLinkedin = now;
  }
  await setDoc(ref, scrubUndefined(payload), { merge: true });
  try {
    await appendSocialFollowerHistoryEntry({
      rede,
      followers: n,
      recordedAtMs: now,
    });
  } catch (e) {
    console.error("[socialFollowerHistory append]", e);
  }
}

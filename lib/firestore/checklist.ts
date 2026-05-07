import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type {
  DailyChecklistDayItem,
  DailyChecklistTask,
} from "@/lib/checklist-types";
import { getFirebaseDb } from "@/lib/firebase";

export type DailyChecklistDayDoc = {
  items?: DailyChecklistDayItem[];
  /** Legado; ignorado quando `items` existe. */
  doneByTaskId?: Record<string, boolean>;
};

const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertChecklistDayIso(dateIso: string): void {
  if (!ISO_DAY_RE.test(dateIso)) {
    throw new Error(`Data de checklist inválida: ${dateIso}`);
  }
}

export function parseDayDocItems(
  data: DailyChecklistDayDoc | undefined,
): DailyChecklistDayItem[] {
  const raw = data?.items;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: DailyChecklistDayItem[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const rec = x as Record<string, unknown>;
    const id = Number(rec.id);
    const title = String(rec.title ?? "").trim();
    if (!Number.isFinite(id) || id < 1 || !title) continue;
    out.push({ id, title, done: rec.done === true });
  }
  out.sort((a, b) => a.id - b.id);
  return out;
}

function nextItemId(items: DailyChecklistDayItem[]): number {
  if (items.length === 0) return 1;
  return Math.max(...items.map((i) => i.id)) + 1;
}

/** Estado completo do checklist de uma data (lista + checks). */
export function subscribeDailyChecklistDay(
  uid: string,
  dateIso: string,
  onNext: (items: DailyChecklistDayItem[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  assertChecklistDayIso(dateIso);
  const db = getFirebaseDb();
  const r = doc(db, "users", uid, "dailyChecklistDay", dateIso);
  return onSnapshot(
    r,
    (snap) => {
      const data = snap.data() as DailyChecklistDayDoc | undefined;
      onNext(parseDayDocItems(data));
    },
    (err) => onError?.(err as Error),
  );
}

/** Todos os dias com checklist (para o calendário). */
export function subscribeDailyChecklistAllDays(
  uid: string,
  onNext: (byDate: Map<string, DailyChecklistDayItem[]>) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const col = collection(db, "users", uid, "dailyChecklistDay");
  return onSnapshot(
    col,
    (snap) => {
      const m = new Map<string, DailyChecklistDayItem[]>();
      for (const d of snap.docs) {
        const data = d.data() as DailyChecklistDayDoc;
        m.set(d.id, parseDayDocItems(data));
      }
      onNext(m);
    },
    (err) => onError?.(err as Error),
  );
}

export async function addDayChecklistItem(
  uid: string,
  dateIso: string,
  title: string,
): Promise<void> {
  assertChecklistDayIso(dateIso);
  const trimmed = title.trim();
  if (!trimmed) return;
  const db = getFirebaseDb();
  const r = doc(db, "users", uid, "dailyChecklistDay", dateIso);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(r);
    const items = [...parseDayDocItems(snap.data() as DailyChecklistDayDoc)];
    items.push({ id: nextItemId(items), title: trimmed, done: false });
    tx.set(r, { items });
  });
}

export async function updateDayChecklistItemTitle(
  uid: string,
  dateIso: string,
  taskId: number,
  title: string,
): Promise<void> {
  assertChecklistDayIso(dateIso);
  const trimmed = title.trim();
  if (!trimmed) return;
  const db = getFirebaseDb();
  const r = doc(db, "users", uid, "dailyChecklistDay", dateIso);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(r);
    const items = [...parseDayDocItems(snap.data() as DailyChecklistDayDoc)];
    const idx = items.findIndex((i) => i.id === taskId);
    if (idx < 0) return;
    items[idx] = { ...items[idx]!, title: trimmed };
    tx.set(r, { items });
  });
}

export async function deleteDayChecklistItem(
  uid: string,
  dateIso: string,
  taskId: number,
): Promise<void> {
  assertChecklistDayIso(dateIso);
  const db = getFirebaseDb();
  const r = doc(db, "users", uid, "dailyChecklistDay", dateIso);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(r);
    if (!snap.exists()) return;
    const items = parseDayDocItems(snap.data() as DailyChecklistDayDoc).filter(
      (i) => i.id !== taskId,
    );
    tx.set(r, { items });
  });
}

export async function setDayChecklistItemDone(
  uid: string,
  dateIso: string,
  taskId: number,
  done: boolean,
): Promise<void> {
  assertChecklistDayIso(dateIso);
  const db = getFirebaseDb();
  const r = doc(db, "users", uid, "dailyChecklistDay", dateIso);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(r);
    const items = parseDayDocItems(snap.data() as DailyChecklistDayDoc).map(
      (i) => (i.id === taskId ? { ...i, done } : i),
    );
    const hit = items.some((i) => i.id === taskId);
    if (!hit) return;
    tx.set(r, { items });
  });
}

/**
 * Migração única: template `dailyChecklistItems` + `doneByTaskId` do doc de hoje → `items` só em `dailyChecklistDay/{today}`.
 * Devolve true se escreveu no Firestore.
 */
export async function migrateLegacyChecklistToToday(
  uid: string,
  todayIso: string,
): Promise<boolean> {
  assertChecklistDayIso(todayIso);
  if (typeof window === "undefined") return false;
  const key = `agir_checklist_items_v1_${uid}`;
  try {
    if (window.localStorage.getItem(key)) return false;
  } catch {
    return false;
  }

  const db = getFirebaseDb();
  const templateCol = collection(db, "users", uid, "dailyChecklistItems");
  let templateSnap;
  try {
    templateSnap = await getDocs(templateCol);
  } catch {
    return false;
  }
  if (templateSnap.empty) {
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      /* noop */
    }
    return false;
  }

  const dayRef = doc(db, "users", uid, "dailyChecklistDay", todayIso);
  let daySnap;
  try {
    daySnap = await getDoc(dayRef);
  } catch {
    return false;
  }
  const existing = daySnap.data() as DailyChecklistDayDoc | undefined;
  const parsed = parseDayDocItems(existing);
  if (parsed.length > 0) {
    try {
      window.localStorage.setItem(key, "1");
    } catch {
      /* noop */
    }
    return false;
  }

  const doneMap = existing?.doneByTaskId ?? {};
  const templateTasks = templateSnap.docs
    .map((d) => d.data() as DailyChecklistTask)
    .sort((a, b) => a.id - b.id);

  const items: DailyChecklistDayItem[] = templateTasks.map((t) => ({
    id: t.id,
    title: String(t.title ?? "").trim() || "—",
    done: doneMap[String(t.id)] === true,
  }));

  try {
    await setDoc(dayRef, { items });
    window.localStorage.setItem(key, "1");
    return true;
  } catch {
    return false;
  }
}

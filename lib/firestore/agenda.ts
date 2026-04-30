import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import type { AgendaEvent } from "@/data/agenda-events";

export const AGENDA_COLLECTION = "agendaEvents";

function docToEvent(
  docId: string,
  data: Record<string, unknown>,
): AgendaEvent {
  const id =
    typeof data.id === "number"
      ? data.id
      : Number(docId.replace(/\D/g, "")) || Number(docId);
  return { ...data, id } as AgendaEvent;
}

export function subscribeAgendaEvents(
  onNext: (events: AgendaEvent[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const col = collection(db, AGENDA_COLLECTION);
  return onSnapshot(
    col,
    (snap) => {
      const events = snap.docs
        .map((d) => docToEvent(d.id, d.data() as Record<string, unknown>))
        .sort(sortAgendaDocs);
      onNext(events);
    },
    (err) => onError?.(err as Error),
  );
}

function sortAgendaDocs(a: AgendaEvent, b: AgendaEvent): number {
  return a.date !== b.date
    ? a.date.localeCompare(b.date)
    : a.time.localeCompare(b.time);
}

/**
 * Ouve apenas eventos cuja propriedade `date` está em [startIso, endIso] (yyyy-MM-dd).
 * Menos dados que subscribeAgendaEvents (útil na página Agenda).
 */
export function subscribeAgendaEventsInDateRange(
  startIso: string,
  endIso: string,
  onNext: (events: AgendaEvent[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const q = query(
    collection(db, AGENDA_COLLECTION),
    where("date", ">=", startIso),
    where("date", "<=", endIso),
  );
  return onSnapshot(
    q,
    (snap) => {
      const events = snap.docs
        .map((d) => docToEvent(d.id, d.data() as Record<string, unknown>))
        .sort(sortAgendaDocs);
      onNext(events);
    },
    (err) => onError?.(err as Error),
  );
}

export async function fetchAgendaEventByNumericId(
  id: number,
): Promise<AgendaEvent | null> {
  const db = getFirebaseDb();
  const ref = doc(db, AGENDA_COLLECTION, String(id));
  const s = await getDoc(ref);
  if (!s.exists()) return null;
  return docToEvent(s.id, s.data() as Record<string, unknown>);
}

function scrubUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

export async function allocateNextAgendaNumericId(): Promise<number> {
  const db = getFirebaseDb();
  const snapshot = await getDocs(collection(db, AGENDA_COLLECTION));
  let maxId = 0;
  for (const d of snapshot.docs) {
    const fromDocId = Number.parseInt(d.id, 10);
    const raw = d.data() as { id?: number };
    const fromField = typeof raw.id === "number" ? raw.id : 0;
    const n = Number.isFinite(fromDocId) ? fromDocId : fromField;
    maxId = Math.max(maxId, n);
  }
  return maxId + 1;
}

/**
 * Cria documento na coleção agenda com id numérico sequencial (compatível com URLs /agenda).
 */
export async function createAgendaDocument(
  event: Omit<AgendaEvent, "id">,
): Promise<number> {
  const id = await allocateNextAgendaNumericId();
  const full: AgendaEvent = { ...event, id };
  const db = getFirebaseDb();
  await setDoc(
    doc(db, AGENDA_COLLECTION, String(id)),
    scrubUndefined({ ...full } as Record<string, unknown>),
  );
  return id;
}

export async function updateAgendaEventFields(
  id: number,
  patch: Partial<Omit<AgendaEvent, "id">>,
): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, AGENDA_COLLECTION, String(id));
  const payload = scrubUndefined({ ...patch } as Record<string, unknown>);
  if (Object.keys(payload).length === 0) return;
  await setDoc(ref, payload, { merge: true });
}

export async function deleteAgendaEvent(id: number): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, AGENDA_COLLECTION, String(id)));
}

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { MapDisplayPoint } from "@/lib/map-features";
import { buildMapDisplayPontoViciado } from "@/lib/custom-ponto-viciado-storage";
import { getFirebaseDb } from "@/lib/firebase";

export const CUSTOM_PONTOS_VICIOS_COLLECTION = "customPontosViciados";

export type CustomPontoViciadoFirestoreDoc = {
  codigo: string;
  /** Subprefeitura territorial (rótulo no UI: Subregional). */
  subprefeitura: string;
  address: string;
  lat: number;
  lng: number;
  createdAtMs?: number;
  updatedAtMs?: number;
  createdByUid?: string;
};

export type CustomPontoViciadoEntry = {
  firestoreDocId: string;
  point: MapDisplayPoint;
};

function snapToEntry(docId: string, data: Record<string, unknown>): CustomPontoViciadoEntry | null {
  const codigo =
    typeof data.codigo === "string" ? data.codigo.trim() : "";
  const address =
    typeof data.address === "string" ? data.address.trim() : "";
  const lat = typeof data.lat === "number" ? data.lat : Number.NaN;
  const lng = typeof data.lng === "number" ? data.lng : Number.NaN;
  const subprefeitura =
    typeof data.subprefeitura === "string" ? data.subprefeitura.trim() : "";

  if (!codigo || !address || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const point = buildMapDisplayPontoViciado({
    id: codigo,
    address,
    position: [lat, lng],
    subprefeitura: subprefeitura || undefined,
  });

  point.detailLines = [
    { label: "Origem", value: "Mapa — partilhado (Firebase)" },
  ];

  return { firestoreDocId: docId, point };
}

export function subscribeCustomPontosViciados(
  onNext: (items: CustomPontoViciadoEntry[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
  const db = getFirebaseDb();
  const col = collection(db, CUSTOM_PONTOS_VICIOS_COLLECTION);
  return onSnapshot(
    col,
    (snap) => {
      const items: CustomPontoViciadoEntry[] = [];
      for (const d of snap.docs) {
        const row = snapToEntry(d.id, d.data() as Record<string, unknown>);
        if (row) items.push(row);
      }
      items.sort((a, b) => a.point.id.localeCompare(b.point.id, "pt-BR"));
      onNext(items);
    },
    (err) => onError?.(err as Error),
  );
}

export type AddCustomPontoViciadoInput = Omit<
  CustomPontoViciadoFirestoreDoc,
  "createdAtMs" | "updatedAtMs" | "createdByUid"
> & {
  createdByUid?: string;
};

export async function addCustomPontoViciado(
  payload: AddCustomPontoViciadoInput,
): Promise<string> {
  const db = getFirebaseDb();
  const now = Date.now();
  const ref = await addDoc(collection(db, CUSTOM_PONTOS_VICIOS_COLLECTION), {
    codigo: payload.codigo.trim(),
    subprefeitura: payload.subprefeitura.trim(),
    address: payload.address.trim(),
    lat: payload.lat,
    lng: payload.lng,
    createdAtMs: now,
    updatedAtMs: now,
    ...(payload.createdByUid ? { createdByUid: payload.createdByUid } : {}),
  });
  return ref.id;
}

export async function updateCustomPontoViciado(
  firestoreDocId: string,
  payload: Omit<AddCustomPontoViciadoInput, "createdByUid">,
): Promise<void> {
  const db = getFirebaseDb();
  const r = doc(db, CUSTOM_PONTOS_VICIOS_COLLECTION, firestoreDocId);
  await updateDoc(r, {
    codigo: payload.codigo.trim(),
    subprefeitura: payload.subprefeitura.trim(),
    address: payload.address.trim(),
    lat: payload.lat,
    lng: payload.lng,
    updatedAtMs: Date.now(),
  });
}

export async function deleteCustomPontoViciado(firestoreDocId: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, CUSTOM_PONTOS_VICIOS_COLLECTION, firestoreDocId));
}

export function firebaseDocIdForPontoCodigo(
  entries: CustomPontoViciadoEntry[],
  codigo: string,
): string | undefined {
  return entries.find((e) => e.point.id === codigo)?.firestoreDocId;
}

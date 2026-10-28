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
import { normalizePontoViciadoCodigo } from "@/lib/ponto-viciado-codigo";

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
  /** Nulo quando o documento só oculta um ponto do catálogo. */
  point: MapDisplayPoint | null;
  ocultoCodigo?: string;
};

function snapToEntry(docId: string, data: Record<string, unknown>): CustomPontoViciadoEntry | null {
  const codigo = normalizePontoViciadoCodigo(
    typeof data.codigo === "string" ? data.codigo : "",
  );
  if (data.oculto === true && codigo) {
    return { firestoreDocId: docId, point: null, ocultoCodigo: codigo };
  }
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
      items.sort((a, b) => {
        const idA = a.point?.id ?? a.ocultoCodigo ?? "";
        const idB = b.point?.id ?? b.ocultoCodigo ?? "";
        return idA.localeCompare(idB, "pt-BR");
      });
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
    codigo: normalizePontoViciadoCodigo(payload.codigo),
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
    codigo: normalizePontoViciadoCodigo(payload.codigo),
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

/** Esconde um ponto do catálogo (planilha) para toda a equipe. */
export async function hidePontoViciadoCodigo(codigo: string): Promise<void> {
  const db = getFirebaseDb();
  const normalized = normalizePontoViciadoCodigo(codigo);
  if (!normalized) return;
  await addDoc(collection(db, CUSTOM_PONTOS_VICIOS_COLLECTION), {
    codigo: normalized,
    oculto: true,
    updatedAtMs: Date.now(),
  });
}

export function firebaseDocIdForPontoCodigo(
  entries: CustomPontoViciadoEntry[],
  codigo: string,
): string | undefined {
  const target = normalizePontoViciadoCodigo(codigo);
  return entries.find(
    (e) => e.point && normalizePontoViciadoCodigo(e.point.id) === target,
  )?.firestoreDocId;
}

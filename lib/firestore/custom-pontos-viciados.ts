import {
  collection,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import type { MapDisplayPoint } from "@/lib/map-features";
import { buildMapDisplayPontoViciado } from "@/lib/custom-ponto-viciado-storage";
import { getFirebaseDb } from "@/lib/firebase";
import { normalizePontoViciadoCodigo } from "@/lib/ponto-viciado-codigo";

export const CUSTOM_PONTOS_VICIOS_COLLECTION = "customPontosViciados";

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

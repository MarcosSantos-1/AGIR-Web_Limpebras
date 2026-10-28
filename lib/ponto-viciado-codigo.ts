import { MAPA_PONTOS_VICIO_FORM } from "@/lib/map-features";

/** Código territorial comparado sem diferença de maiúsculas. */
export function normalizePontoViciadoCodigo(raw: string): string {
  return raw.trim().toUpperCase();
}

export const MSG_PONTO_VICIADO_CODIGO_EM_USO =
  "Este código já está em uso neste mapa.";

export type PontoViciadoCodigoSource = {
  firestoreDocId: string;
  pointId?: string | null;
  ocultoCodigo?: string | null;
};

/**
 * O código está ocupado só por um ponto viciado visível.
 * Ponto excluído (oculto) pode ser cadastrado de novo.
 * Identificador de ecoponto ou de outro marcador não bloqueia.
 */
export function isPontoViciadoCodigoEmUso(
  codigo: string,
  catalogCodigos: readonly string[],
  entries: readonly PontoViciadoCodigoSource[],
  editing?: {
    firestoreDocId?: string | null;
    sourceCodigo?: string | null;
  },
): boolean {
  const target = normalizePontoViciadoCodigo(codigo);
  if (!target) return false;

  const editingSource = editing?.sourceCodigo
    ? normalizePontoViciadoCodigo(editing.sourceCodigo)
    : null;
  if (editingSource && editingSource === target) return false;

  const ocultos = new Set<string>();
  for (const entry of entries) {
    if (!entry.ocultoCodigo) continue;
    ocultos.add(normalizePontoViciadoCodigo(entry.ocultoCodigo));
  }
  if (ocultos.has(target)) return false;

  for (const raw of catalogCodigos) {
    if (normalizePontoViciadoCodigo(raw) === target) return true;
  }

  const editingDoc = editing?.firestoreDocId ?? null;
  for (const entry of entries) {
    if (!entry.pointId) continue;
    if (editingDoc && entry.firestoreDocId === editingDoc) continue;
    if (normalizePontoViciadoCodigo(entry.pointId) === target) return true;
  }
  return false;
}

export function pontoViciadoCodigoEmUsoNoMapa(
  codigo: string,
  entries: readonly PontoViciadoCodigoSource[],
  editing?: {
    firestoreDocId?: string | null;
    sourceCodigo?: string | null;
  },
): boolean {
  return isPontoViciadoCodigoEmUso(
    codigo,
    MAPA_PONTOS_VICIO_FORM.map((ponto) => ponto.id),
    entries,
    editing,
  );
}

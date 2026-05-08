import type { MapDisplayPoint } from "@/lib/map-features";

export const CUSTOM_PONTOS_VICIOS_STORAGE_KEY = "agir:custom-pontos-viciados-v1";

function isMapDisplayPointPv(x: unknown): x is MapDisplayPoint {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    o.type === "ponto-viciado" &&
    typeof o.id === "string" &&
    Array.isArray(o.position) &&
    o.position.length === 2 &&
    typeof o.position[0] === "number" &&
    typeof o.position[1] === "number"
  );
}

export function loadCustomPontosViciadosFromStorage(): MapDisplayPoint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_PONTOS_VICIOS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMapDisplayPointPv);
  } catch {
    return [];
  }
}

export function saveCustomPontosViciadosToStorage(
  items: MapDisplayPoint[],
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    CUSTOM_PONTOS_VICIOS_STORAGE_KEY,
    JSON.stringify(items),
  );
}

export function buildMapDisplayPontoViciado(opts: {
  id: string;
  address: string;
  position: [number, number];
  subprefeitura?: string;
}): MapDisplayPoint {
  return {
    id: opts.id,
    type: "ponto-viciado",
    position: opts.position,
    title: `Ponto viciado — ${opts.id}`,
    address: opts.address.trim() || "Endereço não informado",
    status: "ativo",
    lastAction: null,
    responsible: null,
    recurrent: false,
    occurrences: 0,
    subprefeitura: opts.subprefeitura?.trim() || undefined,
    detailLines: [{ label: "Origem", value: "Mapa — adicionado na aplicação" }],
  };
}

export function ensureUniquePontoViciadoId(
  preferred: string | undefined,
  reserved: Set<string>,
): string {
  const base =
    preferred?.trim() ||
    `PV-NOVO-${Date.now().toString(36)}`;
  let id = base;
  let n = 1;
  while (reserved.has(id)) {
    n += 1;
    id = `${base}-${n}`;
  }
  return id;
}

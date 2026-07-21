import type { AgendaEvent } from "@/data/agenda-events";
import type { HistoryRecordDoc } from "@/data/history-records";
import { mergeHistoryRecordsWithCompletedAgenda } from "@/lib/gallery-albums";

export type PontoViciadoHistoryLink = {
  agendaNumericId: number;
  agendaMonthYm: string;
  date: string;
  title: string;
};

const TITLE_RE = /^Revitalização\s*[—\-]\s*(.+)$/i;
const OBS_RE = /^Ponto viciado:\s*(.+)$/im;
const CODIGO_RE = /^[A-Z]{2,3}-\d+$/i;

function normalizeCodigo(raw: string): string | null {
  const t = raw.trim().toUpperCase();
  if (!CODIGO_RE.test(t)) return null;
  return t;
}

/** Extrai código territorial (ex. CV-011) de título ou observações de revitalização. */
export function extractPontoViciadoCodigoFromRecord(input: {
  title?: string;
  observations?: string;
  type?: string;
}): string | null {
  const fromTitle = input.title ? TITLE_RE.exec(input.title.trim()) : null;
  if (fromTitle?.[1]) {
    const c = normalizeCodigo(fromTitle[1]);
    if (c) return c;
  }
  const fromObs = input.observations
    ? OBS_RE.exec(input.observations)
    : null;
  if (fromObs?.[1]) {
    return normalizeCodigo(fromObs[1]);
  }
  return null;
}

/**
 * Mapa codigo → link do histórico mais recente com revitalização no sistema.
 * Só inclui registos que existem (agenda concluída / historyRecords).
 */
export function buildPontoViciadoHistoryIndex(
  historyRecords: HistoryRecordDoc[],
  agendaEvents: AgendaEvent[],
): Map<string, PontoViciadoHistoryLink> {
  const merged = mergeHistoryRecordsWithCompletedAgenda(
    historyRecords,
    agendaEvents,
  );
  const byCodigo = new Map<string, PontoViciadoHistoryLink>();

  for (const r of merged) {
    if (r.type !== "revitalizacao") continue;
    const codigo = extractPontoViciadoCodigoFromRecord({
      title: r.title,
      observations: r.observations,
      type: r.type,
    });
    if (!codigo) continue;
    const ym = r.date.length >= 7 ? r.date.slice(0, 7) : "";
    if (!ym) continue;

    const next: PontoViciadoHistoryLink = {
      agendaNumericId: r.id,
      agendaMonthYm: ym,
      date: r.date,
      title: r.title,
    };
    const prev = byCodigo.get(codigo);
    if (
      !prev ||
      next.date.localeCompare(prev.date) > 0 ||
      (next.date === prev.date && next.agendaNumericId > prev.agendaNumericId)
    ) {
      byCodigo.set(codigo, next);
    }
  }

  return byCodigo;
}

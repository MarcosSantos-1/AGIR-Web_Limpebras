import type { AgendaEvent } from "@/data/agenda-events";
import type { HistoryRecordDoc } from "@/data/history-records";
import { mergeHistoryRecordsWithCompletedAgenda } from "@/lib/gallery-albums";

export type PontoViciadoHistoryLink = {
  agendaNumericId: number;
  agendaMonthYm: string;
  date: string;
  title: string;
  /** Primeira foto da revitalização concluída no app. */
  photoUrl?: string;
  /** Panfletos distribuídos, quando houve. */
  panfletos?: number;
  /** Quilos de resíduos, sem o sufixo "kg". */
  pesoKg?: string;
};

const TITLE_RE = /^Revitalização\s*[—\-]\s*(.+)$/i;
const OBS_RE = /^Ponto viciado:\s*(.+)$/im;
const CODIGO_RE = /^[A-Z]{2,3}-\d+$/i;

function normalizeCodigo(raw: string): string | null {
  const t = raw.trim().toUpperCase();
  if (!CODIGO_RE.test(t)) return null;
  return t;
}

function pesoKgFromObservations(observations: string): string | undefined {
  const m = /^Resíduos:\s*(.+)$/m.exec(observations);
  const raw = m?.[1]?.replace(/\s*kg\s*$/i, "").trim();
  return raw || undefined;
}

function firstPhotoUrl(urls: Array<string | undefined>): string | undefined {
  for (const url of urls) {
    const t = url?.trim();
    if (t) return t;
  }
  return undefined;
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
  const agendaById = new Map(agendaEvents.map((e) => [e.id, e]));
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

    const ev = agendaById.get(r.id);
    const obs = [r.observations, ev?.observations].filter(Boolean).join("\n");
    const panfletosRaw = r.panfletosDistribuidos ?? ev?.panfletosDistribuidos;
    const photoUrl = firstPhotoUrl([
      ...(r.extraPhotoUrls ?? []),
      ...(ev?.completionPhotoDataUrls ?? []),
    ]);
    const pesoKg = pesoKgFromObservations(obs);
    const next: PontoViciadoHistoryLink = {
      agendaNumericId: r.id,
      agendaMonthYm: ym,
      date: r.date,
      title: r.title,
      ...(photoUrl ? { photoUrl } : {}),
      ...(typeof panfletosRaw === "number" && panfletosRaw > 0
        ? { panfletos: panfletosRaw }
        : {}),
      ...(pesoKg ? { pesoKg } : {}),
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

/** Card de uma ação concluída (revitalização ou outro serviço) pelo id da agenda. */
export function historyCardForAgendaId(
  id: number,
  historyRecords: HistoryRecordDoc[],
  agendaEvents: AgendaEvent[],
): PontoViciadoHistoryLink | null {
  const rec = historyRecords.find((r) => r.id === id);
  const ev = agendaEvents.find((e) => e.id === id);
  if (!rec && (!ev || ev.status !== "concluido")) return null;

  const date = rec?.date || ev?.date || "";
  const ym = date.length >= 7 ? date.slice(0, 7) : "";
  if (!ym) return null;

  const obs = [rec?.observations, ev?.observations].filter(Boolean).join("\n");
  const panfletosRaw = rec?.panfletosDistribuidos ?? ev?.panfletosDistribuidos;
  const photoUrl = firstPhotoUrl([
    ...(rec?.extraPhotoUrls ?? []),
    ...(ev?.completionPhotoDataUrls ?? []),
  ]);
  const pesoKg = pesoKgFromObservations(obs);

  return {
    agendaNumericId: id,
    agendaMonthYm: ym,
    date,
    title: rec?.title || ev?.title || "Ação realizada",
    ...(photoUrl ? { photoUrl } : {}),
    ...(typeof panfletosRaw === "number" && panfletosRaw > 0
      ? { panfletos: panfletosRaw }
      : {}),
    ...(pesoKg ? { pesoKg } : {}),
  };
}

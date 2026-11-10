import type { AgendaEvent } from "@/data/agenda-events";
import type { HistoryRecordDoc } from "@/data/history-records";
import { mergeHistoryRecordsWithCompletedAgenda } from "@/lib/gallery-albums";
import { extractPontoViciadoCodigoFromRecord } from "@/lib/map/ponto-codigo-from-record";

export { extractPontoViciadoCodigoFromRecord };

export type PontoViciadoHistoryLink = {
  agendaNumericId: number;
  agendaMonthYm: string;
  date: string;
  title: string;
  /** Primeira foto da revitalização concluída no app. */
  photoUrl?: string;
  /** Fotos da revitalização concluída, sem repetir a mesma URL. */
  photoUrls?: string[];
  /** Panfletos distribuídos, quando houve. */
  panfletos?: number;
  /** Quilos de resíduos, sem o sufixo "kg". */
  pesoKg?: string;
};

function pesoKgFromObservations(observations: string): string | undefined {
  const m = /^Resíduos:\s*(.+)$/m.exec(observations);
  const raw = m?.[1]?.replace(/\s*kg\s*$/i, "").trim();
  return raw || undefined;
}

function photoUrlsFrom(groups: Array<string[] | undefined>): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const group of groups) {
    for (const url of group ?? []) {
      const clean = url.trim();
      if (!clean || seen.has(clean)) continue;
      seen.add(clean);
      urls.push(clean);
    }
  }
  return urls;
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
    const photoUrls = photoUrlsFrom([r.extraPhotoUrls, ev?.completionPhotoDataUrls]);
    const photoUrl = photoUrls[0];
    const pesoKg = pesoKgFromObservations(obs);
    const next: PontoViciadoHistoryLink = {
      agendaNumericId: r.id,
      agendaMonthYm: ym,
      date: r.date,
      title: r.title,
      ...(photoUrl ? { photoUrl, photoUrls } : {}),
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
  const photoUrls = photoUrlsFrom([rec?.extraPhotoUrls, ev?.completionPhotoDataUrls]);
  const photoUrl = photoUrls[0];
  const pesoKg = pesoKgFromObservations(obs);

  return {
    agendaNumericId: id,
    agendaMonthYm: ym,
    date,
    title: rec?.title || ev?.title || "Ação realizada",
    ...(photoUrl ? { photoUrl, photoUrls } : {}),
    ...(typeof panfletosRaw === "number" && panfletosRaw > 0
      ? { panfletos: panfletosRaw }
      : {}),
    ...(pesoKg ? { pesoKg } : {}),
  };
}

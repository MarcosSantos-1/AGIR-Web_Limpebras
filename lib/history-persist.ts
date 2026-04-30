import type { ActionCompletionPayload } from "@/components/acao-registro/action-completion-dialog";
import type { AgendaEvent } from "@/data/agenda-events";
import type { HistoryRecordDoc } from "@/data/history-records";
import { isSubregionalId } from "@/lib/constants/subregionais";
import { replaceHistoryDoc } from "@/lib/firestore/history";
import { AGENDA_TIME_UNSPECIFIED } from "@/lib/agenda/time-display";
import { replaceDataUrlsWithStorage } from "@/lib/storage/upload-helpers";

function agendaClockToHistoryTime(ev: Pick<AgendaEvent, "time" | "endTime">): string {
  const a = ev.time?.trim() ?? "";
  const b = ev.endTime?.trim() ?? "";
  const u = (x: string) => !x || x === AGENDA_TIME_UNSPECIFIED;
  if (u(a) && u(b)) return "—";
  if (u(a)) return b;
  if (u(b)) return a;
  return `${a} – ${b}`;
}

function revitalizacaoHistoryDescription(ev: AgendaEvent): string {
  const fromCompletion = ev.completionDescription?.trim();
  if (fromCompletion) return fromCompletion;
  const obs = ev.observations ?? "";
  const vol = /^Volume retirado:\s*(.+)$/m.exec(obs);
  const kg = /^Resíduos:\s*(.+)$/m.exec(obs);
  const bits: string[] = [];
  if (vol?.[1]) bits.push(`Volume retirado: ${vol[1].trim()}`);
  if (kg?.[1]) bits.push(`Resíduos: ${kg[1].trim()}`);
  if (bits.length) return bits.join(" · ");
  return ev.title.trim() || "Revitalização concluída";
}

/**
 * Histórico da página `/historico` — alimentado ao marcar compromisso na agenda como concluído.
 * Contagem visual usa só `extraPhotoUrls` (`photos` fica 0 para não duplicar na timeline).
 */
export function historyRecordDocFromCompletedAgendaEvent(
  ev: AgendaEvent,
): HistoryRecordDoc {
  const extra = [...(ev.completionPhotoDataUrls ?? [])];
  const desc =
    ev.type === "revitalizacao"
      ? revitalizacaoHistoryDescription(ev)
      : (ev.completionDescription?.trim() ??
        ev.title.trim() ??
        "");

  const doc: HistoryRecordDoc = {
    id: ev.id,
    title: ev.title,
    type: ev.type,
    status: "concluido",
    date: ev.date,
    time: agendaClockToHistoryTime(ev),
    location: ev.location,
    responsible: ev.responsible,
    description: desc,
    observations: ev.observations ?? "",
    photos: 0,
    linksPostagem:
      ev.linksPostagem && ev.linksPostagem.length > 0
        ? [...ev.linksPostagem]
        : undefined,
    extraPhotoUrls: extra.length > 0 ? extra : undefined,
  };

  if (ev.equipe?.trim()) doc.equipe = ev.equipe.trim();
  if (ev.equipeIntegrantes?.length)
    doc.equipeIntegrantes = [...ev.equipeIntegrantes];
  if (typeof ev.panfletosDistribuidos === "number")
    doc.panfletosDistribuidos = ev.panfletosDistribuidos;
  if (ev.locaisAtendidos?.trim()) doc.locaisAtendidos = ev.locaisAtendidos.trim();
  if (isSubregionalId(ev.subregional)) doc.subregional = ev.subregional;

  return doc;
}

export async function replaceHistoryFromCompletedAgendaEvent(
  ev: AgendaEvent,
): Promise<void> {
  if (ev.status !== "concluido") return;
  await replaceHistoryDoc(historyRecordDocFromCompletedAgendaEvent(ev));
}

export function splitHistoryTime(timeStr: string): { start: string; end: string } {
  const p = timeStr.split(/\s*[-–—]\s*/);
  if (p.length >= 2) {
    return { start: p[0]!.trim(), end: p[1]!.trim() };
  }
  return { start: timeStr.trim(), end: "" };
}

export async function persistHistoryDialog(
  id: number,
  payload: ActionCompletionPayload,
  existing: HistoryRecordDoc,
): Promise<void> {
  const timeDisplay =
    payload.timeStart && payload.timeEnd
      ? `${payload.timeStart} - ${payload.timeEnd}`
      : payload.timeStart || existing.time;
  const urls = await replaceDataUrlsWithStorage(
    payload.photoDataUrls,
    `historico/${id}/evidencias`,
  );
  const baseLinks = Array.isArray(existing.linksPostagem)
    ? [...existing.linksPostagem]
    : [];

  const next: HistoryRecordDoc = {
    ...existing,
    title: payload.title ?? existing.title,
    date: payload.date ?? existing.date,
    time: timeDisplay,
    location: payload.location ?? existing.location,
    responsible: payload.responsible ?? existing.responsible,
    description: payload.description,
    observations: payload.observations,
    linksPostagem: payload.linksPostagem ?? baseLinks,
    extraPhotoUrls: urls ?? [],
  };

  await replaceHistoryDoc(next);
}

export function displayHistoryRow(r: HistoryRecordDoc) {
  const extraPhotos = r.extraPhotoUrls ?? [];
  const baseLinks = r.linksPostagem ?? [];
  return {
    title: r.title,
    date: r.date,
    time: r.time,
    location: r.location,
    responsible: r.responsible,
    description: r.description,
    observations: r.observations,
    linksPostagem: baseLinks,
    extraPhotos,
  };
}

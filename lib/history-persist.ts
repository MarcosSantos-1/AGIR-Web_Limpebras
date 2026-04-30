import type { ActionCompletionPayload } from "@/components/acao-registro/action-completion-dialog";
import type { HistoryRecordDoc } from "@/data/history-records";
import { replaceHistoryDoc } from "@/lib/firestore/history";
import { replaceDataUrlsWithStorage } from "@/lib/storage/upload-helpers";

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

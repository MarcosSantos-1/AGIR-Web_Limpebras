import type { AgendaEvent } from "@/data/agenda-events";
import type { HistoryRecordDoc } from "@/data/history-records";
import {
  historyRecordDocFromCompletedAgendaEvent,
} from "@/lib/history-persist";

/** Labels alinhadas ao filtro de tipo em `/historico`. */
export const GALLERY_SERVICE_TYPE_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "Todos os tipos" },
  { id: "revitalizacao", label: "Revitalização" },
  { id: "vistoria", label: "Vistoria" },
  { id: "visita-tecnica", label: "Visita Técnica" },
  { id: "visita-institucional", label: "Visita Institucional" },
  { id: "reuniao", label: "Reunião" },
  { id: "fiscalizacao", label: "Fiscalização" },
  { id: "acao-ambiental", label: "Ação Ambiental" },
  { id: "limpeza", label: "Limpeza" },
  { id: "panfletagem", label: "Panfletagem" },
];

export type ServiceGalleryAlbum = {
  id: number;
  title: string;
  location: string;
  date: string;
  responsible: string;
  serviceType: string;
  photoUrls: string[];
  description?: string;
  observations?: string;
  /** Registo usado por `openHistoryRecordForEdit`. */
  historyRecord: HistoryRecordDoc;
};

/**
 * Mescla histórico com compromissos concluídos na agenda (sem doc em `historyRecords`),
 * espelhando `/historico`. Escala: subscrição à coleção completa pode ficar pesada no futuro.
 */
export function mergeHistoryRecordsWithCompletedAgenda(
  records: HistoryRecordDoc[],
  agendaEvents: AgendaEvent[],
): HistoryRecordDoc[] {
  const byId = new Map<number, HistoryRecordDoc>();
  for (const r of records) {
    byId.set(r.id, r);
  }
  for (const e of agendaEvents) {
    if (e.status !== "concluido") continue;
    if (!byId.has(e.id)) {
      byId.set(e.id, historyRecordDocFromCompletedAgendaEvent(e));
    }
  }
  return [...byId.values()].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
  );
}

function photoUrlsFromRecord(r: HistoryRecordDoc): string[] {
  return [...(r.extraPhotoUrls ?? [])];
}

/** Só entradas com pelo menos uma URL de evidência (ficheiro real). */
export function galleryAlbumsWithPhotos(
  merged: HistoryRecordDoc[],
): ServiceGalleryAlbum[] {
  const out: ServiceGalleryAlbum[] = [];
  for (const r of merged) {
    const photoUrls = photoUrlsFromRecord(r);
    if (photoUrls.length === 0) continue;
    out.push({
      id: r.id,
      title: r.title,
      location: r.location,
      date: r.date,
      responsible: r.responsible,
      serviceType: r.type,
      photoUrls,
      description: r.description,
      observations: r.observations,
      historyRecord: r,
    });
  }
  return out;
}

/** Antes/Depois aplica-se apenas a revitalização (primeiras duas fotos na ordem salva). */
export function antesDepoisCardLayout(
  serviceType: string,
  photoCount: number,
): boolean {
  return photoCount >= 2 && serviceType === "revitalizacao";
}

export type GalleryLightboxPhotoItem = {
  src: string;
  alt?: string;
  /** Tarja no canto superior esquerdo da imagem / miniatura. */
  badge?: string;
  /** Destaque na fila de miniaturas do lightbox (revitalização: extras mais pequenos). */
  thumbEmphasis?: "hero" | "compact";
};

export function lightboxItemsFromServicePhotos(
  photoUrls: string[],
  serviceType: string,
): GalleryLightboxPhotoItem[] {
  if (serviceType === "revitalizacao" && photoUrls.length >= 2) {
    return photoUrls.map((src, i) => ({
      src,
      badge: i === 0 ? "ANTES" : i === 1 ? "DEPOIS" : undefined,
      thumbEmphasis: i < 2 ? ("hero" as const) : ("compact" as const),
    }));
  }
  return photoUrls.map((src) => ({ src, thumbEmphasis: "hero" as const }));
}

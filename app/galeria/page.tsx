"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PhotoGalleryLightbox } from "@/components/evidence/photo-gallery-lightbox";
import { EvidenceMediaThumb } from "@/components/evidence/evidence-media-thumb";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Calendar, MapPin, Pencil, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { GaleriaAlbumSkeletonGrid } from "@/components/page-skeletons";
import { downloadMediaUrlsSequentially } from "@/lib/download-image";
import { formatDateBr } from "@/lib/utils";
import {
  GALLERY_SERVICE_TYPE_FILTERS,
  antesDepoisCardLayout,
  galleryAlbumsWithPhotos,
  lightboxItemsFromServicePhotos,
  mergeHistoryRecordsWithCompletedAgenda,
  type ServiceGalleryAlbum,
} from "@/lib/gallery-albums";
import { subscribeHistoryRecords } from "@/lib/firestore/history";
import { subscribeAgendaEvents } from "@/lib/firestore/agenda";
import type { HistoryRecordDoc } from "@/data/history-records";
import type { AgendaEvent } from "@/data/agenda-events";
import { useNovaAcao } from "@/components/acao/nova-acao-provider";
import { serviceTypeColor } from "@/lib/constants/service-type-colors";

function serviceTypeLabel(type: string): string {
  const hit = GALLERY_SERVICE_TYPE_FILTERS.find((f) => f.id === type);
  return hit?.label ?? type;
}

/** Identificador do ponto (texto após "Revitalização —") para pesquisa. */
function extractRevitalizacaoPontoId(title: string): string | null {
  const m = /^Revitalização\s*—\s*(.+)$/i.exec(title.trim());
  const part = m?.[1]?.trim();
  return part || null;
}

function albumMatchesSearch(album: ServiceGalleryAlbum, qRaw: string): boolean {
  const t = qRaw.trim().toLowerCase();
  if (!t) return true;
  const revPonto = extractRevitalizacaoPontoId(album.title);
  const haystack = [
    album.title,
    album.location,
    album.responsible,
    album.description ?? "",
    album.observations ?? "",
    String(album.id),
    revPonto ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(t);
}

function albumInCalendarMonth(album: ServiceGalleryAlbum, monthYm: string): boolean {
  return album.date.slice(0, 7) === monthYm;
}

function defaultMonthYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function GaleriaPage() {
  return (
    <AppShell title="Galeria" subtitle="Evidências dos serviços concluídos">
      <GaleriaPageBody />
    </AppShell>
  );
}

function GaleriaPageBody() {
  const [historyRecords, setHistoryRecords] = useState<HistoryRecordDoc[]>([]);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);
  const [historyHydrated, setHistoryHydrated] = useState(false);
  const [agendaHydrated, setAgendaHydrated] = useState(false);
  const [downloadingAlbumId, setDownloadingAlbumId] = useState<number | null>(
    null,
  );
  const { openHistoryRecordForEdit } = useNovaAcao();
  const { user } = useAuth();
  const galleryReady = historyHydrated && agendaHydrated;

  useEffect(() => {
    return subscribeHistoryRecords(
      (list) => {
        setHistoryRecords(list);
        setHistoryHydrated(true);
      },
      () => setHistoryHydrated(true),
    );
  }, []);

  useEffect(() => {
    return subscribeAgendaEvents(
      (list) => {
        setAgendaEvents(list);
        setAgendaHydrated(true);
      },
      () => setAgendaHydrated(true),
    );
  }, []);

  const albums = useMemo(() => {
    const merged = mergeHistoryRecordsWithCompletedAgenda(
      historyRecords,
      agendaEvents,
    );
    return galleryAlbumsWithPhotos(merged);
  }, [historyRecords, agendaEvents]);

  const [monthYm, setMonthYm] = useState(defaultMonthYm);
  const [selectedType, setSelectedType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxAlbum, setLightboxAlbum] = useState<ServiceGalleryAlbum | null>(
    null,
  );
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const filteredAlbums = albums.filter((album) => {
    const typeMatch =
      selectedType === "all" || album.serviceType === selectedType;
    if (!typeMatch) return false;

    const hasSearch = searchQuery.trim().length > 0;
    if (hasSearch) {
      return albumMatchesSearch(album, searchQuery);
    }
    return albumInCalendarMonth(album, monthYm);
  });

  const openLightbox = (album: ServiceGalleryAlbum, index: number) => {
    setLightboxAlbum(album);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleDownloadAllAlbum = async (album: ServiceGalleryAlbum) => {
    if (album.photoUrls.length === 0) return;
    setDownloadingAlbumId(album.id);
    try {
      const token = user ? await user.getIdToken() : null;
      await downloadMediaUrlsSequentially(album.photoUrls, album.title, {
        idToken: token,
      });
    } finally {
      setDownloadingAlbumId(null);
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
        <label className="flex min-w-[200px] flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">
            Mês{" "}
          </span>
          <input
            type="month"
            value={monthYm}
            onChange={(e) => setMonthYm(e.target.value)}
            className="h-10 rounded-xl border-0 bg-white px-3 text-sm font-medium shadow-md shadow-zinc-200/50 focus:outline-none focus:ring-2 focus:ring-[var(--gradient-start)]/20"
          />
        </label>
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Endereço, nome do serviço, ID do registo, ID de revitalização…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-xl border-0 bg-white py-2 pl-9 pr-3 text-sm shadow-md shadow-zinc-200/50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[var(--gradient-start)]/20"
          />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {GALLERY_SERVICE_TYPE_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setSelectedType(filter.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              selectedType === filter.id
                ? "bg-accent-gradient text-white shadow-md shadow-[var(--gradient-start)]/20"
                : "bg-white text-zinc-600 shadow-sm ring-1 ring-zinc-200/80 hover:bg-zinc-50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {!galleryReady ? (
        <GaleriaAlbumSkeletonGrid />
      ) : (
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 pb-8 md:grid-cols-2">
        {filteredAlbums.map((album, setIndex) => {
          const n = album.photoUrls.length;
          const revPair = antesDepoisCardLayout(album.serviceType, n);

          return (
            <motion.article
              key={album.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (setIndex % 6) * 0.03 }}
              className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-lg shadow-zinc-200/40 ring-1 ring-zinc-100"
            >
              <div className="relative max-h-[min(52vh,420px)] shrink-0 bg-zinc-100">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full border-0 bg-black/45 text-white shadow-md backdrop-blur-sm hover:bg-black/60"
                  onClick={() => openHistoryRecordForEdit(album.historyRecord)}
                  aria-label="Editar registo"
                  title="Editar registo"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>

                {n === 1 ? (
                  <button
                    type="button"
                    className="relative block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--gradient-start)]/50"
                    onClick={() => openLightbox(album, 0)}
                  >
                    <EvidenceMediaThumb
                      url={album.photoUrls[0]}
                      className="aspect-[5/4] max-h-64 w-full object-cover object-center sm:max-h-72"
                    />
                  </button>
                ) : null}

                {n > 1 && revPair ? (
                  <div className="flex max-h-72 flex-col sm:max-h-80">
                    <div className="flex min-h-0 w-full gap-0.5">
                      <button
                        type="button"
                        className="relative w-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--gradient-start)]/50"
                        onClick={() => openLightbox(album, 0)}
                      >
                        <EvidenceMediaThumb
                          url={album.photoUrls[0]}
                          className="aspect-[4/5] max-h-56 w-full object-cover sm:max-h-64"
                        />
                        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white sm:text-[10px]">
                          Antes
                        </span>
                      </button>
                      <button
                        type="button"
                        className="relative w-1/2 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--gradient-start)]/50"
                        onClick={() => openLightbox(album, 1)}
                      >
                        <EvidenceMediaThumb
                          url={album.photoUrls[1]}
                          className="aspect-[4/5] max-h-56 w-full object-cover sm:max-h-64"
                        />
                        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white sm:text-[10px]">
                          Depois
                        </span>
                      </button>
                    </div>
                    {album.photoUrls.length > 2 ? (
                      <div className="flex gap-1 overflow-x-auto border-t border-zinc-200/90 bg-zinc-50/95 px-1.5 py-1.5">
                        {album.photoUrls.slice(2).map((url, idx) => (
                          <button
                            key={`${album.id}-x-${idx}`}
                            type="button"
                            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-zinc-200/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gradient-start)]/45 sm:h-14 sm:w-14"
                            onClick={() => openLightbox(album, idx + 2)}
                          >
                            <EvidenceMediaThumb
                              url={url}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {n > 1 && !revPair ? (
                  <div className="flex gap-1 overflow-x-auto overflow-y-hidden px-1 py-1 snap-x snap-mandatory">
                    {album.photoUrls.map((url, idx) => (
                      <button
                        key={`${album.id}-s-${idx}`}
                        type="button"
                        className="relative h-48 max-h-56 w-[82%] shrink-0 snap-center overflow-hidden rounded-lg bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gradient-start)]/45 sm:h-52 sm:w-[78%]"
                        onClick={() => openLightbox(album, idx)}
                      >
                        <EvidenceMediaThumb
                          url={url}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col space-y-1 px-2.5 py-2 pr-14">
                <h3 className="line-clamp-2 pr-8 text-xs font-semibold leading-snug text-zinc-900 sm:text-sm">
                  {album.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-zinc-500 sm:text-xs">
                  <span
                    className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white sm:text-[10px]"
                    style={{ backgroundColor: serviceTypeColor(album.serviceType) }}
                  >
                    {serviceTypeLabel(album.serviceType)}
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-0.5">
                    <MapPin className="h-3 w-3 shrink-0 opacity-80" />
                    <span className="max-w-[11rem] truncate sm:max-w-[13rem]">
                      {album.location}
                    </span>
                  </span>
                  <span className="text-zinc-300">·</span>
                  <span className="inline-flex items-center gap-0.5 tabular-nums">
                    <Calendar className="h-3 w-3 shrink-0 opacity-80" />
                    {formatDateBr(album.date)}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute bottom-2 right-2 z-20 h-9 w-9 rounded-full border-0 bg-black/45 text-white shadow-md backdrop-blur-sm hover:bg-black/60 disabled:pointer-events-none disabled:opacity-60"
                disabled={downloadingAlbumId === album.id}
                aria-label="Descarregar todas as fotos deste registo"
                title="Descarregar todas as fotos"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleDownloadAllAlbum(album);
                }}
              >
                {downloadingAlbumId === album.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="h-4 w-4" aria-hidden />
                )}
              </Button>
            </motion.article>
          );
        })}
      </div>
      )}

      {galleryReady && filteredAlbums.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 shadow-lg shadow-zinc-200/50">
          <Filter className="h-12 w-12 text-zinc-300" />
          <p className="mt-4 text-center text-lg font-medium text-zinc-500">
            Nenhum serviço com fotos encontrado
          </p>
          <p className="mt-1 max-w-md text-center text-sm text-zinc-400">
            {searchQuery.trim()
              ? "Nada coincide com a pesquisa. Tente outros termos ou limpe a pesquisa para ver o mês selecionado."
              : `Nada neste mês (${monthYm.slice(0, 4)}/${monthYm.slice(5)}). Altere o mês ou use a pesquisa para qualquer data.`}
          </p>
        </div>
      )}

      <PhotoGalleryLightbox
        open={lightboxOpen}
        onOpenChange={(o) => {
          setLightboxOpen(o);
          if (!o) setLightboxAlbum(null);
        }}
        title={lightboxAlbum?.title}
        initialIndex={lightboxIndex}
        photos={
          lightboxAlbum
            ? lightboxItemsFromServicePhotos(
                lightboxAlbum.photoUrls,
                lightboxAlbum.serviceType,
              )
            : []
        }
      />
    </>
  );
}

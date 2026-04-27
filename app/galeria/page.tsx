"use client";

import { AppShell } from "@/components/layout/app-shell";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  Upload,
  Calendar,
  MapPin,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  ArrowLeftRight,
  Pencil,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateBr } from "@/lib/utils";
import { ActionCompletionDialog } from "@/components/acao-registro/action-completion-dialog";
import type { ActionCompletionPayload } from "@/components/acao-registro/action-completion-dialog";

const filterOptions = [
  { id: "all", label: "Todas" },
  { id: "antes-depois", label: "Antes/Depois" },
  { id: "por-acao", label: "Por Ação" },
  { id: "por-local", label: "Por Local" },
  { id: "por-data", label: "Por Data" },
  { id: "por-equipe", label: "Por Equipe" },
];

const photoSets = [
  {
    id: 1,
    title: "Revitalização Praça Central",
    type: "antes-depois",
    location: "Praça da República - Centro",
    date: "2026-04-21",
    responsible: "Igor Supervisor",
    photos: [
      { id: 1, type: "antes", color: "bg-zinc-300" },
      { id: 2, type: "depois", color: "bg-emerald-200" },
    ],
  },
  {
    id: 2,
    title: "Limpeza Ponto Viciado R. Silva Jardim",
    type: "antes-depois",
    location: "R. Silva Jardim, 450",
    date: "2026-04-18",
    responsible: "Luciana",
    photos: [
      { id: 3, type: "antes", color: "bg-red-200" },
      { id: 4, type: "depois", color: "bg-green-200" },
    ],
  },
  {
    id: 3,
    title: "Vistoria Ecoponto Zona Norte",
    type: "por-acao",
    location: "R. Industrial, 890",
    date: "2026-04-20",
    responsible: "Maria",
    photos: [
      { id: 5, type: "vistoria", color: "bg-blue-200" },
      { id: 6, type: "vistoria", color: "bg-blue-100" },
      { id: 7, type: "vistoria", color: "bg-blue-200" },
    ],
  },
  {
    id: 4,
    title: "Ação Educativa Escola Municipal",
    type: "por-acao",
    location: "Escola Mun. Nova Esperança",
    date: "2026-04-19",
    responsible: "Maria",
    photos: [
      { id: 8, type: "evento", color: "bg-violet-200" },
      { id: 9, type: "evento", color: "bg-violet-100" },
      { id: 10, type: "evento", color: "bg-violet-200" },
      { id: 11, type: "evento", color: "bg-violet-100" },
    ],
  },
  {
    id: 5,
    title: "Fiscalização Setor Industrial",
    type: "por-acao",
    location: "R. Industrial, 500-800",
    date: "2026-04-17",
    responsible: "Igor Supervisor",
    photos: [
      { id: 12, type: "fiscalizacao", color: "bg-amber-200" },
      { id: 13, type: "fiscalizacao", color: "bg-amber-100" },
    ],
  },
  {
    id: 6,
    title: "Área Crítica Marginal - Progresso",
    type: "antes-depois",
    location: "Av. Marginal, km 5",
    date: "2026-04-15",
    responsible: "Igor Supervisor",
    photos: [
      { id: 14, type: "antes", color: "bg-red-300" },
      { id: 15, type: "durante", color: "bg-amber-200" },
      { id: 16, type: "depois", color: "bg-green-200" },
    ],
  },
];

const GALERIA_EDITS_KEY = "agir_galeria_v1";

export default function GaleriaPage() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSet, setLightboxSet] = useState<typeof photoSets[0] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [galeriaEdits, setGaleriaEdits] = useState<
    Record<number, ActionCompletionPayload>
  >({});
  const [editingSetId, setEditingSetId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GALERIA_EDITS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Record<string, ActionCompletionPayload>;
        setGaleriaEdits(
          Object.fromEntries(
            Object.entries(p).map(([k, v]) => [Number(k), v]),
          ) as Record<number, ActionCompletionPayload>,
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persistGaleria = (id: number, payload: ActionCompletionPayload) => {
    setGaleriaEdits((prev) => {
      const next = { ...prev, [id]: payload };
      try {
        localStorage.setItem(GALERIA_EDITS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const filteredSets = photoSets.filter((set) => {
    const filterMatch = selectedFilter === "all" || set.type === selectedFilter;
    const searchMatch =
      set.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      set.location.toLowerCase().includes(searchQuery.toLowerCase());
    return filterMatch && searchMatch;
  });

  const openLightbox = (set: typeof photoSets[0], index: number) => {
    setLightboxSet(set);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <AppShell title="Galeria" subtitle="Organização visual de evidências">
      {/* Header Actions */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por local ou ação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 w-full rounded-xl border-0 bg-white pl-12 pr-4 text-sm shadow-lg shadow-zinc-200/50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#f318e3]/20"
          />
        </div>
        <Button className="h-12 rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] px-6 text-white shadow-lg shadow-[#f318e3]/25">
          <Upload className="mr-2 h-5 w-5" />
          Upload Fotos
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-8 flex gap-2">
        {filterOptions.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setSelectedFilter(filter.id)}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              selectedFilter === filter.id
                ? "bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] text-white shadow-lg shadow-[#f318e3]/25"
                : "bg-white text-zinc-600 shadow-md hover:bg-zinc-50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Photo Sets Grid */}
      <div className="grid grid-cols-2 gap-6">
        {filteredSets.map((set, setIndex) => (
          <motion.div
            key={set.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: setIndex * 0.1 }}
            className="rounded-3xl bg-white p-6 shadow-lg shadow-zinc-200/50"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-zinc-900">{set.title}</h3>
                <div className="mt-2 flex items-center gap-4 text-sm text-zinc-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {set.location}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-4 text-sm text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDateBr(set.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {set.responsible}
                  </span>
                </div>
              </div>
              {set.type === "antes-depois" && (
                <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-[#f318e3]/10 to-[#6a0eaf]/10 px-3 py-1 text-xs font-medium text-[#9b0ba6]">
                  <ArrowLeftRight className="h-3 w-3" />
                  Antes/Depois
                </span>
              )}
            </div>

            {galeriaEdits[set.id]?.description && (
              <p className="mb-2 text-sm font-medium text-zinc-800">
                {galeriaEdits[set.id].description}
              </p>
            )}
            {galeriaEdits[set.id]?.observations && (
              <p className="mb-2 text-sm text-zinc-600">
                {galeriaEdits[set.id].observations}
              </p>
            )}
            {galeriaEdits[set.id]?.photoDataUrls &&
              galeriaEdits[set.id]!.photoDataUrls.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {galeriaEdits[set.id]!.photoDataUrls.map((url, i) => (
                    <div
                      key={`g-ed-${set.id}-${i}`}
                      className="h-16 w-16 overflow-hidden rounded-xl border border-zinc-100"
                    >
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

            {/* Photos Preview */}
            {set.type === "antes-depois" && set.photos.length >= 2 ? (
              <div className="relative overflow-hidden rounded-2xl">
                <div className="flex">
                  <div
                    className={`relative aspect-[4/3] flex-1 cursor-pointer ${set.photos[0].color}`}
                    onClick={() => openLightbox(set, 0)}
                  >
                    <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-1 text-xs font-medium text-white">
                      ANTES
                    </span>
                  </div>
                  <div className="w-1 bg-white" />
                  <div
                    className={`relative aspect-[4/3] flex-1 cursor-pointer ${set.photos[1].color}`}
                    onClick={() => openLightbox(set, 1)}
                  >
                    <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-1 text-xs font-medium text-white">
                      DEPOIS
                    </span>
                  </div>
                </div>
                {set.photos.length > 2 && (
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {set.photos.slice(2).map((photo, idx) => (
                      <div
                        key={photo.id}
                        className={`aspect-square cursor-pointer rounded-xl ${photo.color}`}
                        onClick={() => openLightbox(set, idx + 2)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {set.photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className={`aspect-square cursor-pointer rounded-xl transition-transform hover:scale-105 ${photo.color}`}
                    onClick={() => openLightbox(set, idx)}
                  />
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-zinc-500">
                {set.photos.length} fotos
              </span>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => setEditingSetId(set.id)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => {
                    /* export relatório do registro */
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Baixar relatório
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Todas
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredSets.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-3xl bg-white py-16 shadow-lg shadow-zinc-200/50">
          <Filter className="h-12 w-12 text-zinc-300" />
          <p className="mt-4 text-lg font-medium text-zinc-500">
            Nenhuma foto encontrada
          </p>
          <p className="text-sm text-zinc-400">
            Tente ajustar os filtros ou a busca
          </p>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && lightboxSet && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          <button
            onClick={() =>
              setLightboxIndex((prev) =>
                prev > 0 ? prev - 1 : lightboxSet.photos.length - 1
              )
            }
            className="absolute left-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <div className="relative max-w-4xl">
            <div
              className={`aspect-[4/3] w-[800px] rounded-2xl ${lightboxSet.photos[lightboxIndex].color}`}
            />
            <div className="absolute bottom-4 left-4 rounded-lg bg-black/50 px-3 py-2 text-white">
              <p className="text-sm font-medium">{lightboxSet.title}</p>
              <p className="text-xs text-white/70">
                {lightboxIndex + 1} / {lightboxSet.photos.length}
              </p>
            </div>
          </div>

          <button
            onClick={() =>
              setLightboxIndex((prev) =>
                prev < lightboxSet.photos.length - 1 ? prev + 1 : 0
              )
            }
            className="absolute right-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
            {lightboxSet.photos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setLightboxIndex(idx)}
                className={`h-2 w-2 rounded-full transition-all ${
                  idx === lightboxIndex
                    ? "w-6 bg-white"
                    : "bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </motion.div>
      )}

      <ActionCompletionDialog
        key={editingSetId ?? "off"}
        variant="gallery"
        open={editingSetId != null}
        onOpenChange={(o) => {
          if (!o) setEditingSetId(null);
        }}
        title={
          editingSetId != null
            ? `Editar álbum — ${
                photoSets.find((s) => s.id === editingSetId)?.title ?? ""
              }`
            : ""
        }
        subtitle="Envio de fotos adicionais e anotações. Dados salvos neste dispositivo."
        initial={(() => {
          const s = photoSets.find((x) => x.id === editingSetId);
          if (!s) {
            return { description: "", observations: "", photoDataUrls: [] };
          }
          const p = galeriaEdits[s.id];
          return {
            description: p?.description ?? "",
            observations: p?.observations ?? "",
            photoDataUrls: p?.photoDataUrls ?? [],
          };
        })()}
        submitLabel="Salvar álbum"
        onSubmit={(payload) => {
          if (editingSetId == null) return;
          persistGaleria(editingSetId, payload);
        }}
      />
    </AppShell>
  );
}

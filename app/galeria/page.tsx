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
  ArrowLeftRight,
  Pencil,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateBr } from "@/lib/utils";
import { ActionCompletionDialog } from "@/components/acao-registro/action-completion-dialog";
import type { GaleriaSetDoc } from "@/data/gallery-sets";
import {
  subscribeGaleriaSets,
} from "@/lib/firestore/gallery";
import { persistGaleriaDialog } from "@/lib/galeria-persist";

const filterOptions = [
  { id: "all", label: "Todas" },
  { id: "antes-depois", label: "Antes/Depois" },
  { id: "por-acao", label: "Por Ação" },
  { id: "por-local", label: "Por Local" },
  { id: "por-data", label: "Por Data" },
  { id: "por-equipe", label: "Por Equipe" },
];

export default function GaleriaPage() {
  const [photoSets, setPhotoSets] = useState<GaleriaSetDoc[]>([]);

  useEffect(() => {
    return subscribeGaleriaSets(setPhotoSets);
  }, []);

  const [selectedFilter, setSelectedFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSet, setLightboxSet] = useState<GaleriaSetDoc | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [editingSetId, setEditingSetId] = useState<number | null>(null);

  const filteredSets = photoSets.filter((set) => {
    const filterMatch = selectedFilter === "all" || set.type === selectedFilter;
    const searchMatch =
      set.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      set.location.toLowerCase().includes(searchQuery.toLowerCase());
    return filterMatch && searchMatch;
  });

  const openLightbox = (set: GaleriaSetDoc, index: number) => {
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

            {set.registroDescription && (
              <p className="mb-2 text-sm font-medium text-zinc-800">
                {set.registroDescription}
              </p>
            )}
            {set.registroObservations && (
              <p className="mb-2 text-sm text-zinc-600">
                {set.registroObservations}
              </p>
            )}
            {set.registroPhotoUrls && set.registroPhotoUrls.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {set.registroPhotoUrls.map((url, i) => (
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
        subtitle="Envio de fotos adicionais e anotações. Dados guardados no Firestore."
        initial={(() => {
          const s = photoSets.find((x) => x.id === editingSetId);
          if (!s) {
            return { description: "", observations: "", photoDataUrls: [] };
          }
          return {
            description: s.registroDescription ?? "",
            observations: s.registroObservations ?? "",
            photoDataUrls: s.registroPhotoUrls ?? [],
          };
        })()}
        submitLabel="Salvar álbum"
        onSubmit={async (payload) => {
          if (editingSetId == null) return;
          const s = photoSets.find((x) => x.id === editingSetId);
          if (!s) return;
          await persistGaleriaDialog(editingSetId, payload, s);
          setEditingSetId(null);
        }}
      />
    </AppShell>
  );
}

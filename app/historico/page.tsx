"use client";

import { AppShell } from "@/components/layout/app-shell";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Search,
  Calendar,
  MapPin,
  User,
  Image,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  FileText,
  Users,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { serviceTypeColor } from "@/lib/constants/service-type-colors";
import { formatDateBr } from "@/lib/utils";
import { PostLinksDisplay } from "@/components/acao-registro/post-links";
import { SubregionalBadge } from "@/components/subregional-badge";
import type { HistoryRecordDoc } from "@/data/history-records";
import {
  subscribeHistoryRecordsInDateRange,
  deleteHistoryRecord,
} from "@/lib/firestore/history";
import {
  deleteAgendaEvent,
  subscribeAgendaEventsInDateRange,
} from "@/lib/firestore/agenda";
import {
  displayHistoryRow,
  historyRecordDocFromCompletedAgendaEvent,
} from "@/lib/history-persist";
import {
  anchorDateFromYearMonthYm,
  calendarMonthFirestoreRange,
} from "@/lib/date/agenda-view-range";
import type { AgendaEvent } from "@/data/agenda-events";
import { useNovaAcao } from "@/components/acao/nova-acao-provider";
import { PhotoGalleryLightbox } from "@/components/evidence/photo-gallery-lightbox";
import {
  lightboxItemsFromServicePhotos,
  type GalleryLightboxPhotoItem,
} from "@/lib/gallery-albums";

const statusConfig = {
  concluido: { label: "Concluído", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700", iconColor: "text-emerald-500" },
  cancelado: { label: "Cancelado", icon: XCircle, color: "bg-red-100 text-red-700", iconColor: "text-red-500" },
  parcial: { label: "Parcial", icon: AlertTriangle, color: "bg-amber-100 text-amber-700", iconColor: "text-amber-500" },
};

const typeConfig = {
  revitalizacao: { label: "Revitalização" },
  vistoria: { label: "Vistoria" },
  "visita-tecnica": { label: "Visita Técnica" },
  "visita-institucional": { label: "Visita Institucional" },
  reuniao: { label: "Reunião" },
  fiscalizacao: { label: "Fiscalização" },
  "acao-ambiental": { label: "Ação Ambiental" },
  limpeza: { label: "Limpeza" },
  panfletagem: { label: "Panfletagem" },
} as const;

export default function HistoricoPage() {
  return (
    <AppShell title="Histórico" subtitle="Registro oficial de ações realizadas">
      <HistoricoPageBody />
    </AppShell>
  );
}

function HistoricoPageBody() {
  const [monthYm, setMonthYm] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [expandedRecord, setExpandedRecord] = useState<number | null>(null);
  const [records, setRecords] = useState<HistoryRecordDoc[]>([]);
  const [agendaMonthEvents, setAgendaMonthEvents] = useState<AgendaEvent[]>(
    [],
  );
  const { openHistoryRecordForEdit } = useNovaAcao();
  const [photoLightboxOpen, setPhotoLightboxOpen] = useState(false);
  const [photoLightboxTitle, setPhotoLightboxTitle] = useState("");
  const [photoLightboxItems, setPhotoLightboxItems] = useState<
    GalleryLightboxPhotoItem[]
  >([]);
  const [photoLightboxIndex, setPhotoLightboxIndex] = useState(0);

  const openEvidenceLightbox = (
    title: string,
    urls: string[],
    serviceType: string,
    index: number,
  ) => {
    if (urls.length === 0) return;
    setPhotoLightboxTitle(title);
    setPhotoLightboxItems(lightboxItemsFromServicePhotos(urls, serviceType));
    setPhotoLightboxIndex(index);
    setPhotoLightboxOpen(true);
  };

  const bounds = useMemo(() => {
    const anchor =
      anchorDateFromYearMonthYm(monthYm) ??
      new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12, 0, 0, 0);
    return calendarMonthFirestoreRange(anchor);
  }, [monthYm]);

  useEffect(() => {
    return subscribeHistoryRecordsInDateRange(
      bounds.startIso,
      bounds.endIso,
      setRecords,
    );
  }, [bounds.startIso, bounds.endIso]);

  useEffect(() => {
    return subscribeAgendaEventsInDateRange(
      bounds.startIso,
      bounds.endIso,
      setAgendaMonthEvents,
    );
  }, [bounds.startIso, bounds.endIso]);

  const visibleRecords = useMemo(() => {
    const byId = new Map<number, HistoryRecordDoc>();
    for (const r of records) {
      byId.set(r.id, r);
    }
    for (const e of agendaMonthEvents) {
      if (e.status !== "concluido") continue;
      if (!byId.has(e.id)) {
        byId.set(e.id, historyRecordDocFromCompletedAgendaEvent(e));
      }
    }
    return [...byId.values()].sort(
      (a, b) => b.date.localeCompare(a.date) || b.id - a.id,
    );
  }, [records, agendaMonthEvents]);

  const filteredRecords = visibleRecords.filter((record) => {
    const row = displayHistoryRow(record);
    const q = searchQuery.toLowerCase();
    const searchMatch =
      row.title.toLowerCase().includes(q) ||
      row.location.toLowerCase().includes(q) ||
      row.responsible.toLowerCase().includes(q) ||
      (row.linksPostagem?.some((u) => u.toLowerCase().includes(q)) ?? false);
    const typeMatch = selectedType === "all" || record.type === selectedType;
    const statusMatch = selectedStatus === "all" || record.status === selectedStatus;
    return searchMatch && typeMatch && statusMatch;
  });

  const toggleExpand = (id: number) => {
    setExpandedRecord(expandedRecord === id ? null : id);
  };

  const handleDeleteRecord = async (record: HistoryRecordDoc, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (
      !confirm(
        "Eliminar permanentemente? O histórico e o compromisso na agenda são apagados de vez.",
      )
    ) {
      return;
    }
    try {
      await Promise.all([
        deleteHistoryRecord(record.id),
        deleteAgendaEvent(record.id),
      ]);
    } catch (err) {
      console.error(err);
      alert("Não foi possível excluir. Tente de novo.");
    }
  };

  return (
    <>
      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <label className="flex min-w-[200px] flex-col gap-1.5">
          <span className="text-xs font-medium text-zinc-500">Mês</span>
          <input
            type="month"
            value={monthYm}
            onChange={(e) => setMonthYm(e.target.value)}
            className="h-12 rounded-xl border-0 bg-white px-4 text-sm font-medium shadow-lg shadow-zinc-200/50 focus:outline-none focus:ring-2 focus:ring-[#f318e3]/20"
          />
        </label>
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por título, local ou responsável..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 w-full rounded-xl border-0 bg-white pl-12 pr-4 text-sm shadow-lg shadow-zinc-200/50 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#f318e3]/20"
          />
        </div>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="h-12 min-w-[200px] rounded-xl border-0 bg-white px-4 text-sm shadow-lg shadow-zinc-200/50 focus:ring-2 focus:ring-[#f318e3]/20">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Tipos</SelectItem>
            {Object.entries(typeConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="h-12 min-w-[180px] rounded-xl border-0 bg-white px-4 text-sm shadow-lg shadow-zinc-200/50 focus:ring-2 focus:ring-[#f318e3]/20">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Summary — cards pausados; só contador textual por enquanto
      <div className="mb-8 grid grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white p-5 shadow-lg shadow-zinc-200/50"
        >
          <p className="text-sm font-medium text-zinc-500">Total de Registros</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{visibleRecords.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-white p-5 shadow-lg shadow-zinc-200/50"
        >
          <p className="text-sm font-medium text-zinc-500">Concluídos</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">
            {visibleRecords.filter((r) => r.status === "concluido").length}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white p-5 shadow-lg shadow-zinc-200/50"
        >
          <p className="text-sm font-medium text-zinc-500">Parciais</p>
          <p className="mt-2 text-3xl font-semibold text-amber-600">
            {visibleRecords.filter((r) => r.status === "parcial").length}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-white p-5 shadow-lg shadow-zinc-200/50"
        >
          <p className="text-sm font-medium text-zinc-500">Total de Fotos</p>
          <p className="mt-2 text-3xl font-semibold text-[#9b0ba6]">
            {visibleRecords.reduce(
              (sum, r) => sum + r.photos + (r.extraPhotoUrls?.length ?? 0),
              0,
            )}
          </p>
        </motion.div>
      </div>
      */}

      <p className="mb-8 text-sm text-zinc-600">
        <span className="font-semibold tabular-nums text-zinc-900">
          {visibleRecords.length}
        </span>{" "}
        {visibleRecords.length === 1
          ? "registro neste mês"
          : "registros neste mês"}
      </p>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 h-full w-0.5 bg-zinc-200" />

        <div className="space-y-4">
          {filteredRecords.map((record, index) => {
            const row = displayHistoryRow(record);
            const status =
              statusConfig[record.status as keyof typeof statusConfig] ??
              statusConfig.concluido;
            const type =
              typeConfig[record.type as keyof typeof typeConfig] ?? {
                label: record.type,
              };
            const StatusIcon = status.icon;
            const isExpanded = expandedRecord === record.id;

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pl-16"
              >
                {/* Timeline Dot */}
                <div
                  className="absolute left-4 top-6 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white"
                  style={{ backgroundColor: serviceTypeColor(record.type) }}
                >
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>

                <div
                  className={`cursor-pointer rounded-2xl bg-white p-5 shadow-lg shadow-zinc-200/50 transition-all hover:shadow-xl ${
                    isExpanded ? "ring-2 ring-[#f318e3]/30" : ""
                  }`}
                  onClick={() => toggleExpand(record.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="font-semibold text-zinc-900">{row.title}</h4>
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                          <StatusIcon className={`h-3 w-3 ${status.iconColor}`} />
                          {status.label}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p
                          className="text-sm font-medium"
                          style={{ color: serviceTypeColor(record.type) }}
                        >
                          {type.label}
                        </p>
                        <SubregionalBadge subregional={record.subregional} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDateBr(row.date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {row.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {row.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {row.responsible}
                        </span>
                        <span className="flex items-center gap-1">
                          <Image className="h-4 w-4" />
                          {record.photos + row.extraPhotos.length} fotos
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                        aria-label="Editar registro"
                        title="Editar"
                        onClick={(e) => {
                          e.stopPropagation();
                          openHistoryRecordForEdit(record);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
                        aria-label="Excluir registro"
                        title="Excluir"
                        onClick={(e) => void handleDeleteRecord(record, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 transition-transform"
                        aria-label={isExpanded ? "Recolher" : "Expandir"}
                      >
                        <ChevronDown
                          className={`h-4 w-4 text-zinc-500 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 border-t border-zinc-100 pt-4"
                    >
                      {record.type === "panfletagem" && "equipe" in record && (
                        <div className="mb-6 grid gap-4 rounded-xl bg-zinc-50/80 p-4 sm:grid-cols-2">
                          <div className="flex items-start gap-2">
                            <Users className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                            <div>
                              <p className="text-xs font-medium uppercase text-zinc-400">Equipe</p>
                              <p className="mt-1 text-sm text-zinc-800">{record.equipe}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase text-zinc-400">
                              Panfletos distribuídos
                            </p>
                            <p className="mt-1 text-sm text-zinc-800">
                              {record.panfletosDistribuidos?.toLocaleString("pt-BR")}
                            </p>
                          </div>
                          <div className="sm:col-span-2">
                            <p className="text-xs font-medium uppercase text-zinc-400">
                              Locais atendidos
                            </p>
                            <p className="mt-1 text-sm text-zinc-800">{record.locaisAtendidos}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase text-zinc-400">Fotos tiradas</p>
                            <p className="mt-1 text-sm text-zinc-800">{record.photos}</p>
                          </div>
                        </div>
                      )}

                      {row.linksPostagem && row.linksPostagem.length > 0 && (
                        <div className="mb-6">
                          <PostLinksDisplay
                            urls={row.linksPostagem}
                            stopCardClick
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-medium uppercase text-zinc-400">O que foi feito</p>
                          <p className="mt-2 text-sm text-zinc-700">{row.description}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase text-zinc-400">Observações</p>
                          <p className="mt-2 text-sm text-zinc-700">{row.observations}</p>
                        </div>
                      </div>

                      {(record.photos > 0 || row.extraPhotos.length > 0) && (
                        <div className="mt-4">
                          <p className="text-xs font-medium uppercase text-zinc-400">Evidências</p>
                          {row.extraPhotos.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {row.extraPhotos.map((url, i) => (
                                <button
                                  key={`ex-${i}`}
                                  type="button"
                                  className="h-16 w-16 overflow-hidden rounded-lg border border-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f318e3]/40"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    openEvidenceLightbox(
                                      row.title,
                                      row.extraPhotos,
                                      record.type,
                                      i,
                                    );
                                  }}
                                >
                                  <img
                                    src={url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-zinc-500">
                              Registadas {record.photos} foto(s) no resumo, sem ficheiros
                              anexados.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] px-4 py-2 text-sm font-medium text-white"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <FileText className="h-4 w-4" />
                          Gerar Relatório
                        </button>
                        {row.extraPhotos.length > 0 ? (
                          <button
                            type="button"
                            className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              openEvidenceLightbox(
                                row.title,
                                row.extraPhotos,
                                record.type,
                                0,
                              );
                            }}
                          >
                            <Image className="h-4 w-4" />
                            Ver Fotos
                          </button>
                        ) : null}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {filteredRecords.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 shadow-lg shadow-zinc-200/50">
          <FileText className="h-12 w-12 text-zinc-300" />
          <p className="mt-4 text-lg font-medium text-zinc-500">
            Nenhum registro encontrado
          </p>
          <p className="text-sm text-zinc-400">
            Tente ajustar os filtros ou a busca
          </p>
        </div>
      )}

      <PhotoGalleryLightbox
        open={photoLightboxOpen}
        onOpenChange={setPhotoLightboxOpen}
        title={photoLightboxTitle}
        initialIndex={photoLightboxIndex}
        photos={photoLightboxItems}
      />
    </>
  );
}

"use client";

import { AppShell } from "@/components/layout/app-shell";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
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
import { ActionCompletionDialog } from "@/components/acao-registro/action-completion-dialog";
import { PostLinksDisplay } from "@/components/acao-registro/post-links";
import type { HistoryRecordDoc } from "@/data/history-records";
import {
  deleteHistoryRecord,
  subscribeHistoryRecords,
} from "@/lib/firestore/history";
import {
  displayHistoryRow,
  persistHistoryDialog,
  splitHistoryTime,
} from "@/lib/history-persist";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [expandedRecord, setExpandedRecord] = useState<number | null>(null);
  const [records, setRecords] = useState<HistoryRecordDoc[]>([]);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);

  useEffect(() => {
    return subscribeHistoryRecords(setRecords);
  }, []);

  const visibleRecords = records;

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

  const editingRecordBase =
    editingRecordId != null
      ? records.find((r) => r.id === editingRecordId)
      : undefined;
  const editingMerged = editingRecordBase
    ? displayHistoryRow(editingRecordBase)
    : null;

  return (
    <AppShell title="Histórico" subtitle="Registro oficial de ações realizadas">
      {/* Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
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

      {/* Stats Summary */}
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

      {/* Timeline */}
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-6 top-0 h-full w-0.5 bg-zinc-200" />

        <div className="space-y-4">
          {filteredRecords.map((record, index) => {
            const row = displayHistoryRow(record);
            const status = statusConfig[record.status as keyof typeof statusConfig];
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
                      <p
                        className="mt-1 text-sm font-medium"
                        style={{ color: serviceTypeColor(record.type) }}
                      >
                        {type.label}
                      </p>
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
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 gap-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRecordId(record.id);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
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
                          <div className="mt-2 flex flex-wrap gap-2">
                            {[...Array(Math.min(record.photos, 4))].map((_, i) => (
                              <div
                                key={i}
                                className="h-16 w-16 rounded-lg bg-zinc-200"
                              />
                            ))}
                            {record.photos > 4 && (
                              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-zinc-100 text-sm font-medium text-zinc-500">
                                +{record.photos - 4}
                              </div>
                            )}
                            {row.extraPhotos.map((url, i) => (
                              <div
                                key={`ex-${i}`}
                                className="h-16 w-16 overflow-hidden rounded-lg border border-zinc-200"
                              >
                                <img
                                  src={url}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] px-4 py-2 text-sm font-medium text-white">
                          <FileText className="h-4 w-4" />
                          Gerar Relatório
                        </button>
                        <button className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200">
                          <Image className="h-4 w-4" />
                          Ver Fotos
                        </button>
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

      <ActionCompletionDialog
        key={editingRecordId ?? "off"}
        open={editingRecordId != null}
        onOpenChange={(o) => {
          if (!o) setEditingRecordId(null);
        }}
        title={
          editingMerged
            ? `Editar registro — ${editingMerged.title}`
            : ""
        }
        subtitle="Alterações sincronizadas com o Firestore."
        showMetaFields
        showDeleteButton
        onDelete={
          editingRecordId != null
            ? async () => {
                await deleteHistoryRecord(editingRecordId);
                setEditingRecordId(null);
              }
            : undefined
        }
        initial={(() => {
          if (!editingRecordBase) {
            return {
              description: "",
              observations: "",
              photoDataUrls: [],
              linksPostagem: [],
            };
          }
          const r = editingRecordBase;
          const { start, end } = splitHistoryTime(r.time);
          const baseLinks =
            "linksPostagem" in r && Array.isArray(r.linksPostagem)
              ? [...r.linksPostagem]
              : [];
          return {
            title: r.title,
            date: r.date,
            timeStart: start,
            timeEnd: end,
            location: r.location,
            responsible: r.responsible,
            description: r.description,
            observations: r.observations,
            photoDataUrls: r.extraPhotoUrls ?? [],
            linksPostagem: baseLinks,
          };
        })()}
        submitLabel="Salvar"
        onSubmit={async (payload) => {
          if (editingRecordId == null || !editingRecordBase) return;
          await persistHistoryDialog(editingRecordId, payload, editingRecordBase);
          setEditingRecordId(null);
        }}
      />
    </AppShell>
  );
}

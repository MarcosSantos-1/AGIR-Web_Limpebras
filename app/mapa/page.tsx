"use client";

import { AppShell } from "@/components/layout/app-shell";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Plus,
  Filter,
  Layers,
  MapPin,
  AlertTriangle,
  Recycle,
  Building2,
  GraduationCap,
  Trash2,
  RefreshCcw,
  X,
  ChevronRight,
  Camera,
  Clock,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OperationalMapPoint } from "@/components/map/operational-map";

const OperationalMap = dynamic(
  () =>
    import("@/components/map/operational-map").then((m) => m.OperationalMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(60vh,560px)] min-h-[520px] w-full items-center justify-center rounded-3xl bg-zinc-100 text-sm text-zinc-500">
        Carregando mapa…
      </div>
    ),
  }
);

const pointTypes = [
  { id: "ponto-viciado", label: "Ponto Viciado", icon: Trash2, color: "bg-red-500", textColor: "text-red-500" },
  { id: "ecoponto", label: "Ecoponto", icon: Recycle, color: "bg-emerald-500", textColor: "text-emerald-500" },
  { id: "ubs", label: "UBS", icon: Building2, color: "bg-blue-500", textColor: "text-blue-500" },
  { id: "escola", label: "Escola", icon: GraduationCap, color: "bg-violet-500", textColor: "text-violet-500" },
  { id: "area-critica", label: "Área Crítica", icon: AlertTriangle, color: "bg-amber-500", textColor: "text-amber-500" },
  { id: "revitalizacao", label: "Revitalização", icon: RefreshCcw, color: "bg-green-500", textColor: "text-green-500" },
];

const statusFilters = [
  { id: "all", label: "Todos" },
  { id: "ativo", label: "Ativo" },
  { id: "resolvido", label: "Resolvido" },
  { id: "em-andamento", label: "Em Andamento" },
  { id: "recorrente", label: "Recorrente" },
];

const mockPoints = [
  {
    id: 1,
    type: "ponto-viciado",
    title: "Ponto Viciado - R. Silva Jardim",
    address: "R. Silva Jardim, 450",
    status: "ativo",
    lastAction: "2025-04-18",
    responsible: "Igor Supervisor",
    recurrent: true,
    occurrences: 5,
    position: [-23.5629, -46.6544] as [number, number],
  },
  {
    id: 2,
    type: "ecoponto",
    title: "Ecoponto Zona Norte",
    address: "R. Industrial, 890",
    status: "ativo",
    lastAction: "2025-04-20",
    responsible: "Maria",
    recurrent: false,
    occurrences: 0,
    position: [-23.5011, -46.6789] as [number, number],
  },
  {
    id: 3,
    type: "ubs",
    title: "UBS Centro",
    address: "Av. Principal, 450",
    status: "ativo",
    lastAction: "2025-04-15",
    responsible: "Luciana",
    recurrent: false,
    occurrences: 0,
    position: [-23.5505, -46.6333] as [number, number],
  },
  {
    id: 4,
    type: "escola",
    title: "Escola Mun. Nova Esperança",
    address: "R. das Palmeiras, 123",
    status: "ativo",
    lastAction: "2025-04-19",
    responsible: "Maria",
    recurrent: false,
    occurrences: 0,
    position: [-23.5401, -46.6258] as [number, number],
  },
  {
    id: 5,
    type: "area-critica",
    title: "Área Crítica - Marginal",
    address: "Av. Marginal, km 5",
    status: "em-andamento",
    lastAction: "2025-04-17",
    responsible: "Igor Supervisor",
    recurrent: true,
    occurrences: 8,
    position: [-23.5752, -46.6401] as [number, number],
  },
  {
    id: 6,
    type: "revitalizacao",
    title: "Revitalização Praça Central",
    address: "Praça da República",
    status: "em-andamento",
    lastAction: "2025-04-21",
    responsible: "Igor Supervisor",
    recurrent: false,
    occurrences: 0,
    position: [-23.5436, -46.6356] as [number, number],
  },
  {
    id: 7,
    type: "ponto-viciado",
    title: "Ponto Viciado - Terminal",
    address: "Terminal Rodoviário",
    status: "resolvido",
    lastAction: "2025-04-10",
    responsible: "Luciana",
    recurrent: false,
    occurrences: 2,
    position: [-23.5162, -46.6259] as [number, number],
  },
];

export default function MapaPage() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(pointTypes.map((t) => t.id));
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPoint, setSelectedPoint] = useState<typeof mockPoints[0] | null>(null);

  const toggleType = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((t) => t !== typeId)
        : [...prev, typeId]
    );
  };

  const filteredPoints = mockPoints.filter((point) => {
    const typeMatch = selectedTypes.includes(point.type);
    const statusMatch = selectedStatus === "all" || point.status === selectedStatus;
    return typeMatch && statusMatch;
  });

  const mapLayerPoints: OperationalMapPoint[] = filteredPoints.map((p) => ({
    id: p.id,
    type: p.type,
    position: p.position,
    recurrent: p.recurrent,
    occurrences: p.occurrences,
  }));

  const getTypeConfig = (type: string) => {
    return pointTypes.find((t) => t.id === type) || pointTypes[0];
  };

  return (
    <AppShell title="Mapa Operacional" subtitle="Visualização territorial">
      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-72 shrink-0 space-y-6"
        >
          {/* Type Filters */}
          <div className="rounded-2xl bg-white p-5 shadow-lg shadow-zinc-200/50">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900">Tipos de Ponto</h3>
              <Layers className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="space-y-2">
              {pointTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    onClick={() => toggleType(type.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
                      isSelected
                        ? "bg-zinc-100"
                        : "opacity-50 hover:opacity-75"
                    }`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${type.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium text-zinc-700">{type.label}</span>
                    <div className={`ml-auto h-4 w-4 rounded-full border-2 ${isSelected ? "border-[#f318e3] bg-[#f318e3]" : "border-zinc-300"}`}>
                      {isSelected && (
                        <svg className="h-full w-full text-white" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Filters */}
          <div className="rounded-2xl bg-white p-5 shadow-lg shadow-zinc-200/50">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900">Status</h3>
              <Filter className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="space-y-1">
              {statusFilters.map((status) => (
                <button
                  key={status.id}
                  onClick={() => setSelectedStatus(status.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all ${
                    selectedStatus === status.id
                      ? "bg-gradient-to-r from-[#f318e3]/10 to-[#6a0eaf]/10 text-[#9b0ba6]"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add Point Button */}
          <Button className="w-full rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] py-6 text-white shadow-lg shadow-[#f318e3]/25">
            <Plus className="mr-2 h-5 w-5" />
            Adicionar Ponto
          </Button>
        </motion.div>

        {/* Map Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative min-h-[520px] flex-1 overflow-hidden rounded-3xl bg-zinc-200 shadow-lg"
        >
          <div className="absolute inset-0 z-0 h-full w-full min-h-[520px]">
            <OperationalMap
              points={mapLayerPoints}
              selectedId={selectedPoint?.id ?? null}
              onSelectPoint={(id) => {
                const p = mockPoints.find((m) => m.id === id) ?? null;
                setSelectedPoint(p);
              }}
            />
          </div>

          <div className="pointer-events-none absolute bottom-4 left-4 z-[1000]">
            <div className="pointer-events-auto rounded-xl bg-white/90 p-3 shadow-md backdrop-blur-sm">
              <p className="mb-2 text-xs font-semibold text-zinc-500">LEGENDA</p>
              <div className="flex max-w-sm flex-wrap gap-3">
                {pointTypes.map((type) => (
                  <div key={type.id} className="flex items-center gap-1.5">
                    <span className={`h-3 w-3 rounded-full ${type.color}`} />
                    <span className="text-xs text-zinc-600">{type.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute right-4 top-4 z-[1000]">
            <div className="pointer-events-auto rounded-xl bg-white/90 px-4 py-2 shadow-md backdrop-blur-sm">
              <span className="text-sm font-semibold text-zinc-900">
                {filteredPoints.length}
              </span>
              <span className="ml-1 text-sm text-zinc-500">pontos visíveis</span>
            </div>
          </div>
        </motion.div>

        {/* Point Detail Panel */}
        {selectedPoint && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-80 shrink-0"
          >
            <div className="rounded-2xl bg-white p-5 shadow-lg shadow-zinc-200/50">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${getTypeConfig(selectedPoint.type).color}`}>
                    {(() => {
                      const Icon = getTypeConfig(selectedPoint.type).icon;
                      return <Icon className="h-5 w-5 text-white" />;
                    })()}
                  </div>
                  <div>
                    <span className={`text-xs font-medium ${getTypeConfig(selectedPoint.type).textColor}`}>
                      {getTypeConfig(selectedPoint.type).label}
                    </span>
                    <h3 className="font-semibold text-zinc-900">{selectedPoint.title}</h3>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPoint(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 border-t border-zinc-100 pt-4">
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-zinc-400" />
                  <span className="text-zinc-600">{selectedPoint.address}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <span className="text-zinc-600">Última ação: {selectedPoint.lastAction}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-zinc-400" />
                  <span className="text-zinc-600">{selectedPoint.responsible}</span>
                </div>
              </div>

              {selectedPoint.recurrent && (
                <div className="mt-4 rounded-xl bg-red-50 p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">Ponto Recorrente</span>
                  </div>
                  <p className="mt-1 text-xs text-red-600">{selectedPoint.occurrences} ocorrências registradas</p>
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <Button className="flex-1 rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] text-white">
                  <Camera className="mr-2 h-4 w-4" />
                  Fotos
                </Button>
                <Button variant="outline" className="flex-1 rounded-xl">
                  Histórico
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}

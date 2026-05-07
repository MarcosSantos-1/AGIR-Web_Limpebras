"use client";

import { AppShell } from "@/components/layout/app-shell";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useState, useMemo, useRef, FormEvent } from "react";
import {
  Plus,
  Layers,
  MapPin,
  AlertTriangle,
  Recycle,
  Trash2,
  Home,
  X,
  Clock,
  User,
  Search,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type {
  OperationalMapPoint,
  OperationalMapFlyTo,
} from "@/components/map/operational-map";
import { formatDateBr, cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getMapaPointById,
  MAPA_MARKERS,
  MAPA_POLYGONS,
  type MapDisplayPoint,
  type MapPolygon,
} from "@/lib/map-features";

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
  { id: "nucleo-habitacional", label: "Núcleo habitacional", icon: Home, color: "bg-amber-500", textColor: "text-amber-500" },
] as const;

/* Painel "Status" removido temporariamente — filtro usa todos os estados (apenas por tipo de ponto).
   Repor: estado selectedStatus, statusFilters e predicado (p.status === selectedStatus) no useMemo. */

type MapItem = MapDisplayPoint | MapPolygon;

type GeocodeHit = { lat: number; lng: number; formatted_address: string };

export default function MapaPage() {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    pointTypes.map((t) => t.id)
  );
  const [typesPopoverOpen, setTypesPopoverOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapBase, setMapBase] = useState<"carto" | "satellite">("carto");
  const [addressQuery, setAddressQuery] = useState("");
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [geocodeAlternatives, setGeocodeAlternatives] = useState<GeocodeHit[] | null>(null);
  const [flyTo, setFlyTo] = useState<OperationalMapFlyTo | null>(null);
  const [searchPin, setSearchPin] = useState<{ lat: number; lng: number } | null>(null);
  const flyNonceRef = useRef(0);

  const { filteredMarkers, filteredPolygons, visibleCount } = useMemo(() => {
    const markers = MAPA_MARKERS.filter((p) => selectedTypes.includes(p.type));
    const polygons = MAPA_POLYGONS.filter((p) => selectedTypes.includes(p.type));
    return {
      filteredMarkers: markers,
      filteredPolygons: polygons,
      visibleCount: markers.length + polygons.length,
    };
  }, [selectedTypes]);

  const mapLayerPoints: OperationalMapPoint[] = useMemo(
    () =>
      filteredMarkers.map((p) => ({
        id: p.id,
        type: p.type,
        position: p.position,
        recurrent: p.recurrent,
        occurrences: p.occurrences,
      })),
    [filteredMarkers]
  );

  const selectedItem: MapItem | null = getMapaPointById(selectedId);

  const toggleType = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  };

  const getTypeConfig = (type: string) => {
    return pointTypes.find((t) => t.id === type) ?? pointTypes[0];
  };

  const applyGeocodeHit = (hit: GeocodeHit) => {
    flyNonceRef.current += 1;
    setFlyTo({
      lat: hit.lat,
      lng: hit.lng,
      zoom: 17,
      nonce: flyNonceRef.current,
    });
    setGeocodeAlternatives(null);
    setGeocodeError(null);
    setSearchPin({ lat: hit.lat, lng: hit.lng });
    toast.success(hit.formatted_address);
  };

  const handleAddressSearch = async (e?: FormEvent) => {
    e?.preventDefault();
    const q = addressQuery.trim();
    if (!q) {
      setGeocodeError("Indique um endereço.");
      return;
    }
    setGeocodeError(null);
    setGeocodeAlternatives(null);
    setSearchPin(null);
    setGeocodeLoading(true);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: q }),
      });
      const data = (await res.json()) as
        | { results: GeocodeHit[]; error?: string }
        | { error: string };
      if (!res.ok || "error" in data) {
        const msg =
          "error" in data && typeof data.error === "string"
            ? data.error
            : "Pesquisa indisponível.";
        setGeocodeError(msg);
        return;
      }
      if (!data.results.length) {
        setGeocodeError("Nenhum resultado no Brasil. Tente outro termo.");
        return;
      }
      if (data.results.length === 1) {
        applyGeocodeHit(data.results[0]!);
        return;
      }
      setGeocodeAlternatives(data.results);
    } catch {
      setGeocodeError("Falha de rede. Tente novamente.");
    } finally {
      setGeocodeLoading(false);
    }
  };

  return (
    <AppShell title="Mapa Operacional" subtitle="Visualização territorial">
      <div className="flex gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative min-h-[520px] flex-1 overflow-hidden rounded-3xl bg-zinc-200 shadow-lg"
        >
          <div className="absolute inset-0 z-0 h-full w-full min-h-[520px]">
            <OperationalMap
              baseLayer={mapBase}
              points={mapLayerPoints}
              polygons={filteredPolygons}
              selectedId={selectedId}
              onSelectId={(id) => setSelectedId(id)}
              flyTo={flyTo}
              searchResultMarker={searchPin}
            />
          </div>

          <div className="pointer-events-none absolute left-4 top-4 z-[1000] flex w-[min(100%-2rem,20rem)] max-w-sm flex-col items-start gap-2">
            <div className="pointer-events-auto w-full space-y-1">
              <form
                onSubmit={(e) => void handleAddressSearch(e)}
                className="flex gap-1.5 rounded-xl border border-zinc-200/80 bg-white/95 p-1 shadow-md backdrop-blur-sm"
              >
                <Input
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  placeholder="Pesquisar endereço (SP, Brasil)…"
                  aria-label="Pesquisar endereço"
                  className="h-10 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                  disabled={geocodeLoading}
                  autoComplete="street-address"
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="secondary"
                  className="h-10 w-10 shrink-0 rounded-lg"
                  disabled={geocodeLoading}
                  aria-label="Pesquisar"
                >
                  {geocodeLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </form>
              {geocodeError ? (
                <p className="rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-700">{geocodeError}</p>
              ) : null}
              {geocodeAlternatives && geocodeAlternatives.length > 1 ? (
                <ul className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200/80 bg-white/98 text-left text-xs shadow-md">
                  {geocodeAlternatives.map((hit, idx) => (
                    <li key={`${hit.lat}-${hit.lng}-${idx}`}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-zinc-700 hover:bg-zinc-100"
                        onClick={() => applyGeocodeHit(hit)}
                      >
                        {hit.formatted_address}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-left text-[10px] leading-tight text-zinc-400">
                Localização ©{" "}
                <a
                  href="https://www.google.com/maps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-zinc-600"
                >
                  Google
                </a>
              </p>
            </div>

            <Popover open={typesPopoverOpen} onOpenChange={setTypesPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="pointer-events-auto h-11 w-11 shrink-0 rounded-xl border border-zinc-200/80 bg-white/95 shadow-md backdrop-blur-sm hover:bg-white"
                  aria-label="Camadas — tipos de ponto"
                  title="Camadas — tipos de ponto"
                >
                  <Layers className="h-5 w-5 text-zinc-700" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="right"
                sideOffset={8}
                className="z-[1100] w-72 space-y-4 p-5 shadow-lg shadow-zinc-200/50"
              >
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
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
                        type="button"
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
                <Button className="w-full rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] py-6 text-white shadow-lg shadow-[#f318e3]/25">
                  <Plus className="mr-2 h-5 w-5" />
                  Adicionar Ponto
                </Button>
              </PopoverContent>
            </Popover>
          </div>

          <div className="pointer-events-none absolute right-4 top-4 z-[1000] flex flex-col items-end gap-2">
            <div className="pointer-events-auto rounded-xl bg-white/90 px-4 py-2 shadow-md backdrop-blur-sm">
              <span className="text-sm font-semibold text-zinc-900">
                {visibleCount}
              </span>
              <span className="ml-1 text-sm text-zinc-500">pontos visíveis</span>
            </div>

            <div
              className="pointer-events-auto flex items-center overflow-hidden rounded-full border border-zinc-200/80 bg-white/95 p-0.5 shadow-md backdrop-blur-sm"
              role="group"
              aria-label="Tipo de mapa de fundo"
            >
              <button
                type="button"
                title="Mapa padrão (CartoDB Positron)"
                aria-pressed={mapBase === "carto"}
                onClick={() => setMapBase("carto")}
                className={cn(
                  "rounded-full px-3 py-2 text-lg leading-none transition",
                  mapBase === "carto"
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-500 hover:bg-zinc-100",
                )}
              >
                <span role="img" aria-label="Mapa de ruas">🗺️</span>
              </button>
              <button
                type="button"
                title="Vista de satélite (Esri)"
                aria-pressed={mapBase === "satellite"}
                onClick={() => setMapBase("satellite")}
                className={cn(
                  "rounded-full px-3 py-2 text-lg leading-none transition",
                  mapBase === "satellite"
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-500 hover:bg-zinc-100",
                )}
              >
                <span role="img" aria-label="Satélite">🛰️</span>
              </button>
            </div>
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
        </motion.div>

        {selectedItem && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-80 shrink-0"
          >
            <div className="rounded-2xl bg-white p-5 shadow-lg shadow-zinc-200/50">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${getTypeConfig(selectedItem.type).color}`}
                  >
                    {(() => {
                      const Icon = getTypeConfig(selectedItem.type).icon;
                      return <Icon className="h-5 w-5 text-white" />;
                    })()}
                  </div>
                  <div>
                    <span
                      className={`text-xs font-medium ${getTypeConfig(selectedItem.type).textColor}`}
                    >
                      {getTypeConfig(selectedItem.type).label}
                    </span>
                    <h3 className="font-semibold text-zinc-900">{selectedItem.title}</h3>
                    <p className="text-xs font-medium text-zinc-500">
                      {selectedItem.id}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 border-t border-zinc-100 pt-4">
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-zinc-400" />
                  <span className="text-zinc-600">{selectedItem.address}</span>
                </div>
                {selectedItem.lastAction && (
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="h-4 w-4 text-zinc-400" />
                    <span className="text-zinc-600">
                      Última ação: {formatDateBr(selectedItem.lastAction)}
                    </span>
                  </div>
                )}
                {selectedItem.responsible && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 text-zinc-400" />
                    <span className="text-zinc-600">{selectedItem.responsible}</span>
                  </div>
                )}
                {selectedItem.detailLines && selectedItem.detailLines.length > 0 && (
                  <ul className="space-y-2 border-t border-zinc-100 pt-3 text-sm text-zinc-600">
                    {selectedItem.detailLines.map((d) => (
                      <li key={`${d.label}-${d.value}`}>
                        <span className="font-medium text-zinc-700">{d.label}:</span> {d.value}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selectedItem.recurrent && selectedItem.occurrences > 0 && (
                <div className="mt-4 rounded-xl bg-red-50 p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">Ponto recorrente</span>
                  </div>
                  <p className="mt-1 text-xs text-red-600">
                    {selectedItem.occurrences} ocorrência(s) registrada(s)
                  </p>
                </div>
              )}

              {/*
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
              */}
            </div>
          </motion.div>
        )}
      </div>
    </AppShell>
  );
}

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
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useCustomPontosViciados } from "@/contexts/custom-pontos-viciados-context";
import {
  MAPA_MARKERS,
  MAPA_POLYGONS,
  mergeMapMarkers,
  resolveMapaItem,
  allStaticMapMarkerIds,
  type MapDisplayPoint,
  type MapPolygon,
} from "@/lib/map-features";
import { SubregionalSelectField } from "@/components/forms/subregional-select-field";
import {
  subregionalIdFromSubprefeitura,
  subregionalMeta,
  type SubregionalId,
} from "@/lib/constants/subregionais";
import {
  firebaseDocIdForPontoCodigo,
  type CustomPontoViciadoEntry,
} from "@/lib/firestore/custom-pontos-viciados";
import type {
  OperationalMapPoint,
  OperationalMapFlyTo,
} from "@/components/map/operational-map";
import { formatDateBr, cn } from "@/lib/utils";
import { toast } from "sonner";

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
  },
);

const pointTypes = [
  {
    id: "ponto-viciado",
    label: "Ponto Viciado",
    icon: Trash2,
    color: "bg-red-500",
    textColor: "text-red-500",
  },
  {
    id: "ecoponto",
    label: "Ecoponto",
    icon: Recycle,
    color: "bg-emerald-500",
    textColor: "text-emerald-500",
  },
  {
    id: "nucleo-habitacional",
    label: "Núcleo habitacional",
    icon: Home,
    color: "bg-amber-500",
    textColor: "text-amber-500",
  },
] as const;

type MapItem = MapDisplayPoint | MapPolygon;

type GeocodeHit = { lat: number; lng: number; formatted_address: string };

function reservedCodigosForPv(
  customEntries: CustomPontoViciadoEntry[],
  editingFirestoreDocId: string | null,
): Set<string> {
  const s = new Set<string>(allStaticMapMarkerIds());
  for (const e of customEntries) {
    if (
      editingFirestoreDocId &&
      e.firestoreDocId === editingFirestoreDocId
    ) {
      continue;
    }
    s.add(e.point.id);
  }
  return s;
}

export default function MapaPage() {
  const { user } = useAuth();
  const {
    customPontosViciados,
    customPontoEntries,
    addPontoViciado,
    updatePontoViciado,
    deletePontoViciadoByCodigo,
  } = useCustomPontosViciados();

  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    pointTypes.map((t) => t.id),
  );
  const [typesPopoverOpen, setTypesPopoverOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapBase, setMapBase] = useState<"carto" | "satellite">("carto");
  const [addressQuery, setAddressQuery] = useState("");
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [geocodeAlternatives, setGeocodeAlternatives] = useState<
    GeocodeHit[] | null
  >(null);
  const [flyTo, setFlyTo] = useState<OperationalMapFlyTo | null>(null);
  const [searchPin, setSearchPin] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const flyNonceRef = useRef(0);

  const [pickPvLocationMode, setPickPvLocationMode] = useState(false);
  const [addPvOpen, setAddPvOpen] = useState(false);
  const [editingFirestoreDocId, setEditingFirestoreDocId] = useState<
    string | null
  >(null);
  const [addPvCodigo, setAddPvCodigo] = useState("");
  const [addPvEndereco, setAddPvEndereco] = useState("");
  const [addPvSubregionalId, setAddPvSubregionalId] = useState<
    SubregionalId | ""
  >("");
  const [addPvPosition, setAddPvPosition] = useState<
    [number, number] | null
  >(null);
  const [reverseGeoLoading, setReverseGeoLoading] = useState(false);
  const [pvSaving, setPvSaving] = useState(false);
  const [pvDeleteOpen, setPvDeleteOpen] = useState(false);
  const [pvDeleting, setPvDeleting] = useState(false);
  const [pvSubregionalErro, setPvSubregionalErro] = useState(false);

  const mergedMarkers = useMemo(
    () => mergeMapMarkers(customPontosViciados, MAPA_MARKERS),
    [customPontosViciados],
  );

  const { filteredMarkers, filteredPolygons, visibleCount } = useMemo(() => {
    const markers = mergedMarkers.filter((p) => selectedTypes.includes(p.type));
    const polygons = MAPA_POLYGONS.filter((p) =>
      selectedTypes.includes(p.type),
    );
    return {
      filteredMarkers: markers,
      filteredPolygons: polygons,
      visibleCount: markers.length + polygons.length,
    };
  }, [selectedTypes, mergedMarkers]);

  const mapLayerPoints: OperationalMapPoint[] = useMemo(
    () =>
      filteredMarkers.map((p) => ({
        id: p.id,
        type: p.type,
        position: p.position,
        recurrent: p.recurrent,
        occurrences: p.occurrences,
      })),
    [filteredMarkers],
  );

  const selectedItem: MapItem | null = resolveMapaItem(
    mergedMarkers,
    MAPA_POLYGONS,
    selectedId,
  );

  const firebasePvDocId = selectedId
    ? firebaseDocIdForPontoCodigo(customPontoEntries, selectedId)
    : undefined;

  const placementActive = pickPvLocationMode;

  const toggleType = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId)
        ? prev.filter((t) => t !== typeId)
        : [...prev, typeId],
    );
  };

  const getTypeConfig = (type: string) => {
    return pointTypes.find((t) => t.id === type) ?? pointTypes[0];
  };

  async function reverseGeocodeAndFill(lat: number, lng: number) {
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      const data = (await res.json()) as
        | { results: GeocodeHit[]; error?: string }
        | { error: string };

      if (!res.ok || "error" in data) {
        const msg =
          "error" in data && typeof data.error === "string"
            ? data.error
            : "Endereço indisponível.";
        toast.error(msg);
        return false;
      }
      if (!data.results?.length) {
        toast.warning(
          "Coordenadas sem endereço conhecido — preencha o endereço manualmente.",
        );
        return true;
      }
      setAddPvEndereco(data.results[0]!.formatted_address);
      return true;
    } catch {
      toast.error("Falha ao obter o endereço. Tente de novo ou preencha à mão.");
      return false;
    }
  }

  const resetPvModal = () => {
    setEditingFirestoreDocId(null);
    setAddPvCodigo("");
    setAddPvEndereco("");
    setAddPvSubregionalId("");
    setAddPvPosition(null);
    setPickPvLocationMode(false);
    setPvSaving(false);
    setReverseGeoLoading(false);
    setPvSubregionalErro(false);
  };

  const startAddPontoFlow = () => {
    setAddPvOpen(false);
    resetPvModal();
    setPickPvLocationMode(true);
    setTypesPopoverOpen(false);
    toast.message("Toque no mapa no local do ponto viciado.");
  };

  const handlePlacementPick = async (lat: number, lng: number) => {
    if (!pickPvLocationMode) return;

    setPickPvLocationMode(false);
    setAddPvPosition([lat, lng]);

    setReverseGeoLoading(true);
    try {
      setAddPvCodigo("");
      setAddPvSubregionalId("");
      setPvSubregionalErro(false);
      setAddPvEndereco("");
      setEditingFirestoreDocId(null);
      await reverseGeocodeAndFill(lat, lng);
      setAddPvOpen(true);
    } finally {
      setReverseGeoLoading(false);
    }

    flyNonceRef.current += 1;
    setFlyTo({
      lat,
      lng,
      zoom: 17,
      nonce: flyNonceRef.current,
    });
  };

  const openEditPontoFirebase = () => {
    const item =
      selectedItem?.type === "ponto-viciado" ? selectedItem : null;
    if (!item || item.type !== "ponto-viciado") return;
    const fb = firebaseDocIdForPontoCodigo(customPontoEntries, item.id);
    if (!fb) return;
    setEditingFirestoreDocId(fb);
    setAddPvCodigo(item.id);
    setAddPvEndereco(item.address ?? "");
    setAddPvSubregionalId(
      subregionalIdFromSubprefeitura(item.subprefeitura ?? "") ?? "",
    );
    setAddPvPosition(item.position ?? null);
    setPickPvLocationMode(false);
    setPvSubregionalErro(false);
    setAddPvOpen(true);
  };

  const savePontoFirebase = async () => {
    const addr = addPvEndereco.trim();
    if (!addr) {
      toast.error("Indique o endereço.");
      return;
    }
    if (!addPvPosition) {
      toast.error("Defina a posição.");
      return;
    }

    const reserved = reservedCodigosForPv(
      customPontoEntries,
      editingFirestoreDocId,
    );
    const preferred = addPvCodigo.trim();
    if (!preferred) {
      toast.error("Indique o código do ponto.");
      return;
    }
    if (reserved.has(preferred)) {
      toast.error("Este código já está em uso neste mapa.");
      return;
    }
    const finalCodigo = preferred;

    if (!addPvSubregionalId) {
      toast.error("Selecione a subregional.");
      setPvSubregionalErro(true);
      return;
    }
    setPvSubregionalErro(false);

    const subprefeituraLabel = subregionalMeta(addPvSubregionalId).label;

    setPvSaving(true);
    try {
      if (editingFirestoreDocId) {
        await updatePontoViciado(editingFirestoreDocId, {
          codigo: finalCodigo,
          subprefeitura: subprefeituraLabel,
          address: addr,
          lat: addPvPosition[0],
          lng: addPvPosition[1],
        });
        toast.success(`Ponto «${finalCodigo}» atualizado.`);
      } else {
        await addPontoViciado({
          codigo: finalCodigo,
          subprefeitura: subprefeituraLabel,
          address: addr,
          lat: addPvPosition[0],
          lng: addPvPosition[1],
          createdByUid: user?.uid,
        });
        toast.success(`Ponto «${finalCodigo}» guardado para toda a equipa.`);
      }
      resetPvModal();
      setAddPvOpen(false);
      setSelectedId(finalCodigo);
      setSelectedTypes((prev) =>
        prev.includes("ponto-viciado") ? prev : [...prev, "ponto-viciado"],
      );
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível guardar. Verifique sessão Firebase.");
    } finally {
      setPvSaving(false);
    }
  };

  const confirmDeletePvFirebase = async () => {
    if (!selectedId || !firebasePvDocId) return;
    setPvDeleting(true);
    try {
      await deletePontoViciadoByCodigo(selectedId);
      toast.success(`Ponto «${selectedId}» eliminado.`);
      setSelectedId(null);
      setPvDeleteOpen(false);
    } catch {
      toast.error("Não foi possível eliminar o ponto.");
    } finally {
      setPvDeleting(false);
    }
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
          className="relative flex min-h-0 flex-1 flex-col gap-3"
        >
          <div className="relative min-h-[520px] flex-1 overflow-hidden rounded-3xl bg-zinc-200 shadow-lg">
            <div className="absolute inset-0 z-0 h-full w-full min-h-[520px]">
              <OperationalMap
                baseLayer={mapBase}
                points={mapLayerPoints}
                polygons={filteredPolygons}
                selectedId={selectedId}
                onSelectId={(id) => setSelectedId(id)}
                flyTo={flyTo}
                searchResultMarker={searchPin}
                placementMode={placementActive && !reverseGeoLoading}
                onPlacementClick={(lat, lng) => void handlePlacementPick(lat, lng)}
              />
            </div>

            {pickPvLocationMode ? (
              <div className="pointer-events-none absolute bottom-36 left-1/2 z-[1001] max-w-[min(100vw-3rem,24rem)] -translate-x-1/2">
                <p className="pointer-events-none rounded-xl border border-[#f318e3]/40 bg-[#f318e3]/15 px-4 py-2 text-center text-xs font-medium text-[#7a0867] backdrop-blur-sm">
                  {reverseGeoLoading
                    ? "A obter o endereço (logradouro e bairro)…"
                    : "Toque no mapa para criar o ponto."}
                </p>
              </div>
            ) : null}

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
                  <p className="rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-700">
                    {geocodeError}
                  </p>
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
                    <h3 className="font-semibold text-zinc-900">
                      Tipos de Ponto
                    </h3>
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
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${type.color}`}
                          >
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-zinc-700">
                            {type.label}
                          </span>
                          <div
                            className={`ml-auto h-4 w-4 rounded-full border-2 ${isSelected ? "border-[#f318e3] bg-[#f318e3]" : "border-zinc-300"}`}
                          >
                            {isSelected && (
                              <svg
                                className="h-full w-full text-white"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  fill="currentColor"
                                  d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                                />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="pointer-events-none absolute right-4 top-4 z-[1000] flex flex-col items-end gap-2">
              <div className="pointer-events-auto rounded-xl bg-white/90 px-4 py-2 shadow-md backdrop-blur-sm">
                <span className="text-sm font-semibold text-zinc-900">
                  {visibleCount}
                </span>
                <span className="ml-1 text-sm text-zinc-500">
                  pontos visíveis
                </span>
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
                  <span role="img" aria-label="Mapa de ruas">
                    🗺️
                  </span>
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
                  <span role="img" aria-label="Satélite">
                    🛰️
                  </span>
                </button>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-4 left-4 z-[1000]">
              <div className="pointer-events-auto rounded-xl bg-white/90 p-3 shadow-md backdrop-blur-sm">
                <p className="mb-2 text-xs font-semibold text-zinc-500">
                  LEGENDA
                </p>
                <div className="flex max-w-sm flex-wrap gap-3">
                  {pointTypes.map((type) => (
                    <div key={type.id} className="flex items-center gap-1.5">
                      <span
                        className={`h-3 w-3 rounded-full ${type.color}`}
                      />
                      <span className="text-xs text-zinc-600">{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap justify-center gap-3">
            <Button
              type="button"
              disabled={reverseGeoLoading}
              className="h-11 rounded-xl bg-gradient-to-r from-[#f318e3] to-[#6a0eaf] px-6 text-white shadow-lg shadow-[#f318e3]/25"
              onClick={startAddPontoFlow}
            >
              <Plus className="mr-2 h-5 w-5" />
              Adicionar ponto viciado
            </Button>
            {pickPvLocationMode ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => {
                  setPickPvLocationMode(false);
                  toast.message("Modo de toque no mapa cancelado.");
                }}
              >
                Cancelar adicionar
              </Button>
            ) : null}
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
                    <h3 className="font-semibold text-zinc-900">
                      {selectedItem.title}
                    </h3>
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
                  <MapPin className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="text-zinc-600">{selectedItem.address}</span>
                </div>
                {selectedItem.type === "ponto-viciado" &&
                  selectedItem.subprefeitura ? (
                    <div className="flex items-center gap-3 text-sm">
                      <Layers className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span className="text-zinc-600">
                        Subregional: {selectedItem.subprefeitura}
                      </span>
                    </div>
                  ) : null}
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
                    <span className="text-zinc-600">
                      {selectedItem.responsible}
                    </span>
                  </div>
                )}
                {selectedItem.detailLines &&
                  selectedItem.detailLines.length > 0 && (
                    <ul className="space-y-2 border-t border-zinc-100 pt-3 text-sm text-zinc-600">
                      {selectedItem.detailLines.map((d) => (
                        <li key={`${d.label}-${d.value}`}>
                          <span className="font-medium text-zinc-700">
                            {d.label}:
                          </span>{" "}
                          {d.value}
                        </li>
                      ))}
                    </ul>
                  )}
              </div>

              {selectedItem.recurrent && selectedItem.occurrences > 0 && (
                <div className="mt-4 rounded-xl bg-red-50 p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">
                      Ponto recorrente
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-red-600">
                    {selectedItem.occurrences} ocorrência(s) registrada(s)
                  </p>
                </div>
              )}

              {firebasePvDocId &&
              selectedItem.type === "ponto-viciado" &&
              !pickPvLocationMode ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1 rounded-xl"
                    onClick={openEditPontoFirebase}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-xl border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => setPvDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </div>

      <Dialog
        open={addPvOpen}
        onOpenChange={(open) => {
          setAddPvOpen(open);
          if (!open) resetPvModal();
        }}
      >
        <DialogContent className="z-[1200] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingFirestoreDocId
                ? "Editar ponto viciado"
                : "Novo ponto viciado"}
            </DialogTitle>
            <DialogDescription>
              <strong>Código</strong> e <strong>subregional</strong> são
              obrigatórios. Após tocar no mapa, tentamos montar{" "}
              <strong>logradouro, número e bairro</strong> a partir do Google —
              ajuste o texto se precisar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pv-codigo">Código *</Label>
              <Input
                id="pv-codigo"
                value={addPvCodigo}
                onChange={(e) => setAddPvCodigo(e.target.value)}
                placeholder="ex.: CV-200"
                autoComplete="off"
                disabled={pvSaving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pv-endereco">Endereço *</Label>
              <Input
                id="pv-endereco"
                value={addPvEndereco}
                onChange={(e) => setAddPvEndereco(e.target.value)}
                placeholder="Rua, número — bairro"
                autoComplete="street-address"
                disabled={pvSaving}
              />
            </div>
            <SubregionalSelectField
              id="pv-subregional"
              value={addPvSubregionalId}
              onChange={(v) => {
                setAddPvSubregionalId(v);
                setPvSubregionalErro(false);
              }}
              error={pvSubregionalErro}
              disabled={pvSaving}
              excludeIds={["interno"]}
              hideFooterText
              showAbbrevPrefix
              labelSuffix={
                <>
                  {" "}
                  <span className="text-red-600">*</span>
                </>
              }
              className="space-y-1.5 sm:col-span-1"
            />
            {addPvPosition ? (
              <p className="text-xs tabular-nums text-zinc-600">
                Lat {addPvPosition[0].toFixed(5)}, Lng{" "}
                {addPvPosition[1].toFixed(5)}
              </p>
            ) : (
              <p className="text-xs text-amber-800">
                A posição deve vir do toque no mapa ao criar o ponto.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pvSaving}
              onClick={() => {
                setAddPvOpen(false);
                resetPvModal();
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={pvSaving || reverseGeoLoading}
              onClick={() => void savePontoFirebase()}
            >
              {pvSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pvDeleteOpen} onOpenChange={setPvDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ponto viciado?</AlertDialogTitle>
            <AlertDialogDescription>
              «{selectedId}» será removido da nuvem para toda a equipe. Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pvDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-600/90"
              disabled={pvDeleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDeletePvFirebase();
              }}
            >
              {pvDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

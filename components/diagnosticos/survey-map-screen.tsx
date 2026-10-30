"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Loader2, LocateFixed, MapPin, Navigation, Search, Signal, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useSurveyWorkspace } from "@/hooks/use-survey-workspace";
import { distanceMeters, surveyPointState, SURVEY_COLORS } from "@/lib/survey-workspace";
import { surveyProgress } from "@/lib/levantamentos";
import { SurveyOnboarding } from "./survey-onboarding";
import type { SurveyLocation } from "./survey-leaflet-map";
import type { Diagnostic } from "@/lib/diagnosticos";

const LeafletMap = dynamic(() => import("./survey-leaflet-map"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center bg-zinc-100"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando mapa…</div> });

export function SurveyMapScreen({ mobile = false }: { mobile?: boolean }) {
  const params = useSearchParams();
  const workspace = useSurveyWorkspace(params.get("levantamento"));
  const [location, setLocation] = useState<SurveyLocation | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"todos" | "preenchidos" | "inativos">("todos");
  const [target, setTarget] = useState<{ lat: number; lng: number; nonce: number } | null>(null);
  const firstLocation = useRef(true);
  const openedPoint = useRef<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<Diagnostic | null>(null);
  const [search, setSearch] = useState("");
  const [showNearby, setShowNearby] = useState(false);
  const pontoParam = params.get("ponto");

  useEffect(() => {
    if (!gpsEnabled) return;
    if (!navigator.geolocation) { queueMicrotask(() => setGpsError("Este navegador não oferece localização. Você pode escolher os pontos manualmente.")); return; }
    const watch = navigator.geolocation.watchPosition((p) => {
      setLocation({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }); setGpsError("");
      if (firstLocation.current) { firstLocation.current = false; setTarget({ lat: p.coords.latitude, lng: p.coords.longitude, nonce: Date.now() }); }
    }, (e) => setGpsError(e.code === 1 ? "Localização não autorizada. Libere o GPS nas permissões do navegador ou selecione um ponto manualmente." : "GPS indisponível. Confira o sinal e tente centralizar novamente."), { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 });
    return () => navigator.geolocation.clearWatch(watch);
  }, [gpsEnabled]);

  const originalIndex = useMemo(() => new Map(workspace.baseline.map((r) => [r.pointId, r])), [workspace.baseline]);
  const catalogueIndex = useMemo(() => new Map(workspace.points.map((p) => [p.id, p])), [workspace.points]);
  const mapRows = useMemo(() => workspace.rows.flatMap((row) => {
    const lat = Number(row.answers.latitude); const lng = Number(row.answers.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || row.answers.latitude === "" || row.answers.latitude === undefined || row.answers.longitude === "" || row.answers.longitude === undefined) return [];
    const position: [number, number] = [lat, lng];
    const state = surveyPointState(row, originalIndex.get(row.pointId), catalogueIndex.get(row.pointId)?.status === "inativo");
    return [{ row, id: row.pointId, position, state, distance: location ? distanceMeters([location.lat, location.lng], position) : null }];
  }), [workspace.rows, originalIndex, catalogueIndex, location]);
  const visible = mapRows.filter((item) => {
    if (search && !`${item.id} ${item.row.answers.endereco}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === "preenchidos") return item.state === "concluido";
    if (statusFilter === "inativos") return item.state === "inativo";
    return true;
  });
  const nearby = [...visible].sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  const item = mapRows.find((p) => p.id === selected);
  const progress = workspace.survey ? surveyProgress(workspace.survey.expectedCodes, workspace.records) : null;
  function center() {
    if (location) setTarget({ lat: location.lat, lng: location.lng, nonce: Date.now() });
    else { firstLocation.current = true; setGpsEnabled(false); window.setTimeout(() => setGpsEnabled(true), 0); }
  }
  function pick(id: string) { setSelected(id); setShowNearby(false); }
  useEffect(() => {
    if (!pontoParam || !workspace.ready || openedPoint.current === pontoParam) return;
    const row = workspace.rows.find((item) => item.pointId.toUpperCase() === pontoParam.toUpperCase());
    if (!row) return;
    openedPoint.current = pontoParam;
    setSelected(row.pointId);
    setEditing(row);
    const lat = Number(row.answers.latitude);
    const lng = Number(row.answers.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) setTarget({ lat, lng, nonce: Date.now() });
  }, [pontoParam, workspace.ready, workspace.rows]);
  const content = <div className={mobile ? "fixed inset-0 flex h-dvh flex-col bg-zinc-50 dark:bg-zinc-950" : "space-y-4"}>
    <header className={`z-10 flex items-center gap-3 ${mobile ? "bg-white px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] dark:bg-zinc-950" : ""}`}><Button asChild variant="ghost" size="icon" className="shrink-0 rounded-xl"><Link href="/diagnosticos" aria-label="Voltar aos levantamentos"><ArrowLeft className="h-5 w-5" /></Link></Button><div className="min-w-0 flex-1"><h1 className="truncate text-base font-semibold">{workspace.survey?.title ?? "Preenchimento em campo"}</h1><p className="text-xs text-zinc-500">{progress ? `${progress.completed} / ${progress.total} pontos concluídos` : "Escolha um levantamento para acompanhar"}</p></div>{location && <span className="flex items-center gap-1 text-[10px] font-medium text-blue-600"><Signal className="h-3.5 w-3.5" />GPS ±{Math.round(location.accuracy)}m</span>}</header>
    {workspace.error ? <div role="alert" className="m-4 rounded-2xl bg-orange-50 p-5 text-sm text-orange-900">{workspace.error}</div> : !workspace.ready ? <div role="status" className={`flex items-center justify-center gap-3 ${mobile ? "flex-1" : "h-[calc(100dvh-15rem)] min-h-96 rounded-3xl border bg-white dark:bg-zinc-900"}`}><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /><div><p className="font-medium">Preparando o mapa</p><p className="text-sm text-zinc-500">Carregando pontos e a sua localização…</p></div></div> : !workspace.survey ? <div className="m-5 rounded-3xl border bg-white p-8 text-center dark:bg-zinc-900"><ClipboardList className="mx-auto mb-4 h-10 w-10 text-emerald-600" /><h2 className="font-semibold">Nenhum levantamento em preenchimento</h2><p className="my-3 text-sm text-zinc-500">Crie ou reabra um levantamento na página de Diagnósticos para iniciar o trabalho em campo.</p><Button asChild><Link href="/diagnosticos">Ir para levantamentos</Link></Button></div> : <>
      <div className={`relative min-h-0 overflow-hidden ${mobile ? "flex-1" : "h-[calc(100dvh-15rem)] min-h-96 rounded-3xl border"}`}>
        <LeafletMap markers={visible} selected={selected} location={location} target={target} onSelect={pick} />
        <div className="absolute inset-x-3 top-3 z-10 space-y-2"><div className="flex items-center gap-2 rounded-2xl border bg-white/95 px-3 shadow-sm backdrop-blur dark:bg-zinc-900/95"><Search className="h-4 w-4 shrink-0 text-zinc-400" /><input aria-label="Buscar ponto no mapa" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Código ou endereço" value={search} onChange={(e) => setSearch(e.target.value)} />{search && <button aria-label="Limpar busca" onClick={() => setSearch("")}><X className="h-4 w-4" /></button>}</div><div className="flex gap-1.5" role="group" aria-label="Filtrar pontos do diagnóstico">{([["todos", "Todos"], ["preenchidos", "Preenchidos"], ["inativos", "Inativos"]] as const).map(([value, label]) => <button key={value} aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)} className={`rounded-full border px-3 py-2 text-xs font-medium shadow-sm ${statusFilter === value ? "border-emerald-600 bg-emerald-600 text-white" : "bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"}`}>{label}</button>)}</div>{gpsError && <p role="status" className="rounded-xl bg-amber-50/95 p-3 text-xs text-amber-900">{gpsError}</p>}</div>
        <button aria-label="Centralizar na minha localização" onClick={center} className="absolute bottom-24 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-2xl border bg-white text-blue-600 shadow-lg dark:bg-zinc-900"><LocateFixed className="h-6 w-6" /></button>
        <div className="absolute inset-x-3 bottom-5 z-10 rounded-2xl border bg-white/95 p-3 shadow-lg backdrop-blur dark:bg-zinc-900/95"><div className="flex items-center justify-between gap-2"><div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium">{Object.entries(SURVEY_COLORS).map(([key, color]) => <span key={key} className="flex items-center gap-1"><span style={{ backgroundColor: color }} className="h-2.5 w-2.5 rounded-full" />{key === "concluido" ? "Concluído" : key === "inativo" ? "Inativo" : "Pendente"}</span>)}</div><button onClick={() => setShowNearby(true)} className="flex shrink-0 items-center gap-1 rounded-xl bg-zinc-100 px-3 py-2 text-xs dark:bg-zinc-800"><Navigation className="h-3.5 w-3.5" />{visible.length} pontos</button></div>{!visible.length && <p className="mt-2 text-xs text-zinc-500">Nenhum ponto neste filtro.</p>}</div>
      </div>
    </>}
    <Drawer open={!!item && !editing} onOpenChange={(open) => { if (!open) setSelected(null); }}><DrawerContent className="rounded-t-3xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"><DrawerHeader><DrawerTitle className="flex items-center gap-2"><MapPin style={{ color: item ? SURVEY_COLORS[item.state] : undefined }} className="h-5 w-5" />{item?.id}</DrawerTitle><DrawerDescription>{String(item?.row.answers.endereco ?? "")}</DrawerDescription></DrawerHeader>{item && <div className="space-y-4 px-5"><div className="flex flex-wrap gap-2"><span className="rounded-full px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: SURVEY_COLORS[item.state] }}>{item.state === "concluido" ? "Concluído neste levantamento" : item.state === "inativo" ? "Inativo · confirmar em campo" : item.row.revision > 0 ? "Rascunho salvo" : "Pendente de preenchimento"}</span>{item.distance !== null && <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">{item.distance < 1000 ? `${Math.round(item.distance)} m de você` : `${(item.distance / 1000).toFixed(1)} km de você`}</span>}</div><p className="text-xs text-zinc-500">{String(item.row.answers.subprefeitura ?? "")} · {item.row.photos.length} fotos{item.row.updatedAtMs ? ` · Atualizado em ${new Date(item.row.updatedAtMs).toLocaleDateString("pt-BR")}` : ""}</p><Button disabled={workspace.survey?.status !== "em-preenchimento"} className="h-12 w-full rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => setEditing(item.row)}>{item.state === "concluido" ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <ClipboardList className="mr-2 h-4 w-4" />}{item.row.revision > 0 ? "Revisar preenchimento" : "Iniciar preenchimento"}<ArrowRight className="ml-2 h-4 w-4" /></Button>{workspace.survey?.status !== "em-preenchimento" && <p className="text-xs text-zinc-500">Reabra o levantamento para atualizar os dados.</p>}</div>}</DrawerContent></Drawer>
    <Drawer open={showNearby} onOpenChange={setShowNearby}><DrawerContent className="rounded-t-3xl"><DrawerHeader><DrawerTitle>{location ? "Pontos mais próximos" : "Pontos neste mapa"}</DrawerTitle><DrawerDescription>{location ? "Ordenados pela distância da sua localização." : "Ative a localização para ordenar pela distância."}</DrawerDescription></DrawerHeader><div className="max-h-[55dvh] space-y-2 overflow-y-auto p-4 pb-8">{nearby.slice(0, 60).map((p) => <button key={p.id} onClick={() => { setTarget({ lat: p.position[0], lng: p.position[1], nonce: Date.now() }); pick(p.id); }} className="flex w-full items-center gap-3 rounded-2xl bg-zinc-50 p-3 text-left dark:bg-zinc-900"><span style={{ backgroundColor: SURVEY_COLORS[p.state] }} className="h-3 w-3 shrink-0 rounded-full" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{p.id}</p><p className="truncate text-xs text-zinc-500">{String(p.row.answers.endereco)}</p></div><span className="text-xs text-zinc-400">{p.distance !== null ? `${Math.round(p.distance)} m` : ""}</span></button>)}{!nearby.length && <p className="p-4 text-sm text-zinc-500">Nenhum ponto nesta seleção.</p>}</div></DrawerContent></Drawer>
    {editing && <SurveyOnboarding initial={editing} survey={workspace.survey} presentation={mobile ? "screen" : "dialog"} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setSelected(null); }} />}
  </div>;
  return mobile ? content : <AppShell responsive title="Diagnósticos no mapa" subtitle="Todos os pontos, incluindo os inativos">{content}</AppShell>;
}
